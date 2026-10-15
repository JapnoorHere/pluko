import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';
import {createMockProvider} from '../providers.mjs';

const api=await startApi();
test.after(()=>api.close());
const {tick}=await import('../jobs.mjs');
const hooks=await import('../webhooks.mjs');
const {openApiDocument}=await import('../openapi.mjs');

async function drain(provider=createMockProvider(),max=60) {
  for(let index=0;index<max;index++){
    api.store.run('UPDATE tasks SET next_at=0');
    if(!await tick('test-worker',provider))return;
  }
  throw new Error('worker did not settle');
}
async function setup(email,url='https://hooks.example.test/pluko?token=SUPER-SECRET-PATH-TOKEN') {
  const client=api.client();
  await client.register(email);
  const project=await client.project('Hooks');
  const configured=url?await client.post('/api/projects/webhook',{id:project.projectId,webhook_url:url}):null;
  return {client,...project,secret:configured?.json?.webhook_secret,configured};
}
const deliveries=projectId=>api.store.all('SELECT * FROM webhook_deliveries WHERE project_id=? ORDER BY created,rowid',projectId);
const recorder=(status=200)=>{const calls=[];return {calls,post:async(url,options)=>{calls.push({url,...options});if(status instanceof Error)throw status;return status;}};};

test('webhook URLs must be public https addresses',()=>{
  assert.equal(hooks.validateWebhookUrl('https://hooks.example.com/path?x=1').url,'https://hooks.example.com/path?x=1');
  for(const bad of ['','   ',null,'not a url','http://example.com/hook','https://user:pass@example.com/','https://example.com:8443/hook','https://127.0.0.1/hook','https://[::1]/hook','https://localhost/hook','https://app.localhost/hook','https://intranet/hook','https://printer.local/hook','https://db.internal/hook','https://'+'a'.repeat(2100)+'.com']){
    assert.ok(hooks.validateWebhookUrl(bad).error,`should reject ${String(bad).slice(0,40)}`);
  }
});

test('signatures verify, and tampering, wrong secrets and replays are rejected',()=>{
  const secret=hooks.newWebhookSecret(),body=JSON.stringify({a:1}),t=Date.now();
  assert.match(secret,/^whsec_/);
  const header=hooks.signatureHeader(secret,t,body);
  assert.equal(hooks.verifySignature(secret,header,body),true);
  assert.equal(hooks.verifySignature(secret,header,body+' '),false);
  assert.equal(hooks.verifySignature(hooks.newWebhookSecret(),header,body),false);
  assert.equal(hooks.verifySignature(secret,hooks.signatureHeader(secret,t-10*60000,body),body),false,'older than five minutes');
  for(const malformed of ['','garbage','t=abc,v1=00','t=1','v1=00',undefined])assert.equal(hooks.verifySignature(secret,malformed,body),false);
});

test('the sender refuses private destinations and plain http before any request is made',async()=>{
  await assert.rejects(hooks.postWebhook('http://example.com/hook',{body:'{}'}),/https on port 443/);
  await assert.rejects(hooks.postWebhook('https://example.com:8443/hook',{body:'{}'}),/https on port 443/);
  await assert.rejects(hooks.postWebhook('https://127.0.0.1/hook',{body:'{}'}),/public address/);
  await assert.rejects(hooks.postWebhook('https://[::1]/hook',{body:'{}'}),/public address/);
  await assert.rejects(hooks.postWebhook('https://169.254.169.254/latest/meta-data',{body:'{}'}),/public address/);
});

test('configuring a webhook returns the secret once and never lists it',async()=>{
  const {client,projectId,secret,configured}=await setup('hook-config@example.test');
  assert.equal(configured.status,200);
  assert.match(secret,/^whsec_/);
  const listed=await client.get('/api/projects');
  assert.equal(listed.json.projects[0].webhook_url,'https://hooks.example.test/pluko?token=SUPER-SECRET-PATH-TOKEN');
  assert.equal(listed.text.includes(secret),false);
  assert.equal(listed.text.includes('webhook_secret'),false);
  assert.notEqual(api.store.get('SELECT webhook_secret FROM projects WHERE id=?',projectId).webhook_secret,secret,'stored sealed, not in plain text');

  const changed=await client.post('/api/projects/webhook',{id:projectId,webhook_url:'https://other.example.test/hook'});
  assert.equal(changed.json.webhook_secret,null,'changing the URL keeps the same secret');
  const rotated=await client.post('/api/projects/webhook',{id:projectId,webhook_url:'https://other.example.test/hook',rotate:true});
  assert.match(rotated.json.webhook_secret,/^whsec_/);
  assert.notEqual(rotated.json.webhook_secret,secret);

  for(const bad of ['http://insecure.example.test','https://127.0.0.1/x','nonsense']){
    const response=await client.post('/api/projects/webhook',{id:projectId,webhook_url:bad});
    assert.equal(response.status,400);
    assert.equal(response.json.error.code,'INVALID_WEBHOOK_URL');
  }
  const removed=await client.post('/api/projects/webhook',{id:projectId,webhook_url:null});
  assert.equal(removed.json.webhook_url,null);
  assert.equal(api.store.get('SELECT webhook_secret w FROM projects WHERE id=?',projectId).w,null);
});

test('webhook URLs and secrets are redacted from request logs',async()=>{
  const {projectId}=await setup('hook-redact@example.test');
  const rows=api.store.all("SELECT payload,response FROM requests WHERE path='/api/projects/webhook'");
  assert.ok(rows.length>0);
  for(const row of rows){
    assert.equal(String(row.payload).includes('SUPER-SECRET-PATH-TOKEN'),false);
    assert.equal(String(row.response).includes('SUPER-SECRET-PATH-TOKEN'),false);
    assert.equal(/whsec_[A-Za-z0-9_-]+/.test(String(row.response)),false);
  }
  assert.ok(projectId);
});

test('a finished job produces one signed delivery with the job summary',async()=>{
  const {client,key,projectId,secret}=await setup('hook-deliver@example.test');
  const created=await client.post('/v1/images/search',{query:'webhook cats',count:'40'},{key});
  assert.equal(deliveries(projectId).length,0,'nothing is sent while the job is queued');
  await drain();
  const queued=deliveries(projectId);
  assert.equal(queued.length,1);
  assert.equal(queued[0].event,'job.finished');
  assert.equal(queued[0].status,'pending');

  const sink=recorder(200);
  await hooks.deliverDue({post:sink.post,limit:100});
  const mine=sink.calls.filter(item=>item.headers['Pluko-Delivery']===queued[0].id);
  assert.equal(mine.length,1);
  const call=mine[0];
  assert.equal(call.url,'https://hooks.example.test/pluko?token=SUPER-SECRET-PATH-TOKEN');
  assert.equal(call.headers['Pluko-Event'],'job.finished');
  assert.equal(call.headers['Pluko-Delivery'],queued[0].id);
  assert.equal(hooks.verifySignature(secret,call.headers['Pluko-Signature'],call.body),true);
  const event=JSON.parse(call.body);
  assert.equal(event.type,'job.finished');
  assert.equal(event.data.job_id,created.json.job_id);
  assert.equal(event.data.status,'complete');
  assert.equal(event.data.returned,40);
  assert.equal(event.data.queries[0].query,'webhook cats');
  assert.equal(event.data.results_url,`/v1/jobs/${created.json.job_id}/results`);
  assert.equal('filters' in event.data,false);
  const done=deliveries(projectId)[0];
  assert.equal(done.status,'delivered');
  assert.equal(done.attempts,1);
  assert.equal(done.last_status,200);
  await hooks.deliverDue({post:sink.post,limit:100});
  assert.equal(sink.calls.filter(item=>item.headers['Pluko-Delivery']===queued[0].id).length,1,'delivered events are not sent again');
});

test('failed deliveries back off, give up after five attempts, and can be redelivered',async()=>{
  const {client,key,projectId}=await setup('hook-retry@example.test');
  await client.post('/v1/images/search',{query:'retry me',count:'5'},{key});
  await drain();
  const id=deliveries(projectId)[0].id;
  const failing=recorder(500);
  let clock=Date.now();
  for(let attempt=1;attempt<=5;attempt++){
    assert.equal(await hooks.deliverDue({post:failing.post,at:clock}),1,`attempt ${attempt}`);
    const row=api.store.get('SELECT * FROM webhook_deliveries WHERE id=?',id);
    assert.equal(row.attempts,attempt);
    assert.equal(row.last_status,500);
    assert.match(row.last_error,/HTTP 500/);
    if(attempt<5){
      assert.equal(row.status,'pending');
      assert.equal(row.next_at,clock+hooks.WEBHOOK.backoffMs[attempt-1]);
      assert.equal(await hooks.deliverDue({post:failing.post,at:clock+1000}),0,'not due yet');
      clock=row.next_at;
    }else assert.equal(row.status,'failed');
  }
  assert.equal(failing.calls.length,5);

  assert.equal((await client.post('/api/webhooks/redeliver',{id})).status,202);
  const reset=api.store.get('SELECT * FROM webhook_deliveries WHERE id=?',id);
  assert.equal(reset.status,'pending');
  assert.equal(reset.attempts,0);
  assert.equal(await hooks.deliverDue({post:recorder(204).post}),1);
  assert.equal(api.store.get('SELECT status FROM webhook_deliveries WHERE id=?',id).status,'delivered');
  assert.equal((await client.post('/api/webhooks/redeliver',{id})).status,202);
  assert.equal((await client.post('/api/webhooks/redeliver',{id})).status,409,'already queued');
});

test('network errors are recorded without crashing the worker',async()=>{
  const {client,key,projectId}=await setup('hook-neterror@example.test');
  await client.post('/v1/images/search',{query:'network error',count:'5'},{key});
  await drain();
  await hooks.deliverDue({post:recorder(new Error('connect ECONNREFUSED')).post});
  const row=deliveries(projectId)[0];
  assert.equal(row.status,'pending');
  assert.equal(row.attempts,1);
  assert.match(row.last_error,/ECONNREFUSED/);
  assert.equal(row.last_status,null);
});

test('cancelling queues one cancelled event, and finished jobs cannot be cancelled',async()=>{
  const {client,key,projectId}=await setup('hook-cancel@example.test');
  const created=await client.post('/v1/images/search',{query:'cancel hooks',count:'50'},{key});
  assert.equal((await client.post(`/v1/jobs/${created.json.job_id}/cancel`,{},{key})).status,200);
  const rows=deliveries(projectId);
  assert.equal(rows.length,1);
  assert.equal(JSON.parse(rows[0].payload).data.status,'cancelled');
  const again=await client.post(`/v1/jobs/${created.json.job_id}/cancel`,{},{key});
  assert.equal(again.status,409);
  assert.equal(again.json.error.code,'JOB_FINISHED');
  assert.equal(deliveries(projectId).length,1);
  assert.equal((await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job.status,'cancelled');

  const done=await client.post('/v1/images/search',{query:'finish then cancel',count:'5'},{key});
  await drain();
  assert.equal((await client.post(`/v1/jobs/${done.json.job_id}/cancel`,{},{key})).status,409);
  assert.equal((await client.get(`/v1/jobs/${done.json.job_id}`,{key})).json.job.status,'complete','a finished job keeps its status');
});

test('the test button sends a signed test event, and needs a webhook first',async()=>{
  const none=await setup('hook-test-none@example.test',null);
  assert.equal((await none.client.post('/api/projects/webhook/test',{id:none.projectId})).status,409);

  const {client,projectId,secret}=await setup('hook-test@example.test');
  const sent=await client.post('/api/projects/webhook/test',{id:projectId});
  assert.equal(sent.status,202);
  const sink=recorder(200);
  await hooks.deliverDue({post:sink.post,limit:100});
  const mine=sink.calls.find(call=>call.headers['Pluko-Delivery']===sent.json.delivery_id);
  assert.ok(mine,'the test event was delivered');
  assert.equal(mine.headers['Pluko-Event'],'webhook.test');
  assert.equal(hooks.verifySignature(secret,mine.headers['Pluko-Signature'],mine.body),true);
  const listed=await client.get(`/api/webhooks/deliveries?project_id=${projectId}`);
  assert.equal(listed.status,200);
  assert.equal(listed.json.deliveries[0].event,'webhook.test');
  assert.equal(listed.json.deliveries[0].status,'delivered');
  assert.equal('payload' in listed.json.deliveries[0],false,'payload bodies are not listed');
});

test('removing a webhook stops queued deliveries, and other accounts cannot see or retry them',async()=>{
  const {client,key,projectId}=await setup('hook-remove@example.test');
  await client.post('/v1/images/search',{query:'removed',count:'5'},{key});
  await drain();
  const id=deliveries(projectId)[0].id;
  await client.post('/api/projects/webhook',{id:projectId,webhook_url:null});
  const sink=recorder(200);
  await hooks.deliverDue({post:sink.post,limit:100});
  assert.equal(sink.calls.some(item=>item.headers['Pluko-Delivery']===id),false,'a removed webhook receives nothing');
  const row=api.store.get('SELECT * FROM webhook_deliveries WHERE id=?',id);
  assert.equal(row.status,'failed');
  assert.match(row.last_error,/removed/);

  const stranger=api.client();
  await stranger.register('hook-stranger@example.test');
  assert.equal((await stranger.get(`/api/webhooks/deliveries?project_id=${projectId}`)).status,404);
  assert.equal((await stranger.post('/api/webhooks/redeliver',{id})).status,404);
  assert.equal((await stranger.post('/api/projects/webhook',{id:projectId,webhook_url:'https://x.example.test/h'})).status,404);
});

test('projects without a webhook queue nothing, and deleting a project removes its deliveries',async()=>{
  const {client,key,projectId}=await setup('hook-none@example.test',null);
  await client.post('/v1/images/search',{query:'silent',count:'5'},{key});
  await drain();
  assert.equal(deliveries(projectId).length,0);

  const withHook=await setup('hook-cleanup@example.test');
  await withHook.client.post('/v1/images/search',{query:'cleanup',count:'5'},{key:withHook.key});
  await drain();
  assert.equal(deliveries(withHook.projectId).length,1);
  assert.equal((await withHook.client.post('/api/projects/delete',{id:withHook.projectId,confirm:'Hooks'})).status,200);
  assert.equal(deliveries(withHook.projectId).length,0);
});

test('service status is public and reflects the worker and provider switch',async()=>{
  const anonymous=api.client();
  const down=await anonymous.get('/v1/status');
  assert.equal(down.status,200);
  assert.equal(down.json.worker,'offline');
  assert.equal(down.json.status,'degraded');
  api.store.run('INSERT INTO workers(id,heartbeat) VALUES(?,?)','worker_status_test',Date.now());
  const up=await anonymous.get('/v1/status');
  assert.deepEqual([up.json.status,up.json.api,up.json.worker,up.json.provider],['ok','ok','online','enabled']);
  api.store.run("UPDATE settings SET value='false' WHERE key='provider_enabled'");
  const paused=await anonymous.get('/v1/status');
  assert.deepEqual([paused.json.status,paused.json.provider],['degraded','paused']);
  api.store.run("UPDATE settings SET value='true' WHERE key='provider_enabled'");
  api.store.run("DELETE FROM workers WHERE id='worker_status_test'");
  assert.equal(api.store.get("SELECT count(*) n FROM requests WHERE path='/v1/status'").n,0,'status checks are not logged');
});

function resolveRefs(node,document) {
  if(Array.isArray(node))return node.forEach(item=>resolveRefs(item,document));
  if(node&&typeof node==='object'){
    if(node.$ref){
      assert.match(node.$ref,/^#\/components\/schemas\//);
      const name=node.$ref.split('/').pop();
      assert.ok(document.components.schemas[name],`unresolved ${node.$ref}`);
      return;
    }
    Object.values(node).forEach(value=>resolveRefs(value,document));
  }
}

test('the OpenAPI document is complete and every reference resolves',async()=>{
  const served=await api.client().get('/v1/openapi.json');
  assert.equal(served.status,200);
  assert.equal(served.json.openapi,'3.1.0');
  assert.equal('request_id' in served.json,false,'the document is served as-is');
  assert.equal(served.json.servers[0].url,api.base);
  assert.deepEqual(served.json,JSON.parse(JSON.stringify(openApiDocument(api.base))));
  resolveRefs(served.json,served.json);
  const operations=Object.values(served.json.paths).flatMap(item=>Object.values(item));
  for(const operation of operations){
    assert.ok(operation.operationId,'every operation needs an operationId');
    assert.ok(operation.responses&&Object.keys(operation.responses).length,`${operation.operationId} needs responses`);
  }
  assert.equal(new Set(operations.map(operation=>operation.operationId)).size,operations.length,'operation ids are unique');
  assert.ok(served.json.webhooks.jobFinished);
  assert.deepEqual(served.json.components.schemas.SearchRequest.properties.safe_search.enum,['moderate','strict']);
});

test('documented response fields exist in real responses',async()=>{
  const {client,key}=await setup('contract@example.test',null);
  const spec=openApiDocument(api.base).components.schemas;
  const check=(name,value,path)=>{for(const field of spec[name].required)assert.ok(field in value,`${path} is missing documented field "${field}"`);};
  const created=await client.post('/v1/images/search',{query:'contract',count:'5'},{key});
  check('SearchAccepted',created.json,'POST /v1/images/search');
  await drain();
  const job=await client.get(`/v1/jobs/${created.json.job_id}`,{key});
  check('JobResponse',job.json,'GET /v1/jobs/{id}');
  check('Job',job.json.job,'job');
  check('Task',job.json.job.queries[0],'task');
  check('JobList',(await client.get('/v1/jobs',{key})).json,'GET /v1/jobs');
  const page=await client.get(`/v1/jobs/${created.json.job_id}/results`,{key});
  check('ResultsPage',page.json,'GET results');
  check('Image',page.json.images[0],'image');
  check('Usage',(await client.get('/v1/usage',{key})).json,'GET /v1/usage');
  check('Status',(await client.get('/v1/status')).json,'GET /v1/status');
  check('Error',(await client.get('/v1/jobs/job_missing',{key})).json,'404 error');
});
