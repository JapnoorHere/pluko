import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());
const {requestedWait,parseDelivery}=await import('../delivery.mjs');
const {enqueueJobFinished}=await import('../webhooks.mjs');
const {jobView}=await import('../jobs.mjs');

const owner=api.client();
await owner.register('delivery-owner@example.test');

// Plays the worker: finishes a job with a few results shortly after it is created.
function finishSoon(jobIdPromise,{delay=300,images=3}={}){
  return (async()=>{
    const jobId=await jobIdPromise;
    await new Promise(resolve=>setTimeout(resolve,delay));
    const task=api.store.get('SELECT id FROM tasks WHERE job_id=?',jobId);
    for(let n=1;n<=images;n++)api.store.run('INSERT INTO results(id,job_id,task_id,url,data) VALUES(?,?,?,?,?)',`img_${jobId}_${n}`,jobId,task.id,`https://img.example/${jobId}/${n}.jpg`,JSON.stringify({id:`img_${jobId}_${n}`,image_url:`https://img.example/${jobId}/${n}.jpg`}));
    api.store.run("UPDATE tasks SET status='complete',found=? WHERE job_id=?",images,jobId);
    api.store.run("UPDATE jobs SET status='complete',updated=? WHERE id=?",Date.now(),jobId);
  })();
}
// The newest job for a project, once the search request has created it.
async function nextJobId(projectId,after){
  for(let i=0;i<100;i++){
    const row=api.store.get('SELECT id FROM jobs WHERE project_id=? AND created>=? ORDER BY rowid DESC LIMIT 1',projectId,after);
    if(row)return row.id;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  throw new Error('job was not created');
}
async function projectWithKey(body){
  const created=await owner.post('/api/projects',body);
  assert.equal(created.status,201,JSON.stringify(created.json));
  const key=await owner.post('/api/keys',{project_id:created.json.id,name:'k',days:30,scopes:['search','read']});
  return {id:created.json.id,key:key.json.secret,created:created.json};
}

test('delivery settings are validated',()=>{
  assert.deepEqual(parseDelivery({}),{delivery:'poll',wait_seconds:10});
  assert.deepEqual(parseDelivery({delivery:'wait',wait_seconds:5}),{delivery:'wait',wait_seconds:5});
  assert.throws(()=>parseDelivery({delivery:'email'}),/poll, wait or webhook/);
  assert.throws(()=>parseDelivery({delivery:'wait',wait_seconds:30}),/from 1 to 10/);
  assert.equal(requestedWait({delivery:'wait',wait_seconds:5},''),5);
  assert.equal(requestedWait({delivery:'poll',wait_seconds:5},''),0);
  assert.equal(requestedWait({delivery:'wait',wait_seconds:5},'respond-async'),0);
  assert.equal(requestedWait({delivery:'poll',wait_seconds:5},'wait=3'),3);
  assert.equal(requestedWait({delivery:'poll',wait_seconds:5},'return=minimal, wait=60'),10,'never more than the maximum');
});

test('wait mode returns the images in the same response when the job finishes in time',async()=>{
  const project=await projectWithKey({name:'Waits',delivery:'wait',wait_seconds:3});
  assert.equal(project.created.delivery,'wait');
  const started=Date.now();
  const worker=finishSoon(nextJobId(project.id,started));
  const response=await owner.post('/v1/images/search',{query:'lamps',count:'3'},{key:project.key});
  await worker;
  assert.equal(response.status,200);
  assert.equal(response.json.status,'complete');
  assert.equal(response.json.waited,true);
  assert.equal(response.json.images.length,3);
  assert.equal(response.json.next_cursor,null);
  assert.ok(response.json.job_id&&response.json.results_url,'the usual job fields are still there');
  assert.equal(response.headers.get('preference-applied'),'wait=3');
  assert.ok(Date.now()-started<2500,'it returns as soon as the job is done');
});

test('a wait that runs out falls back to the normal job response',async()=>{
  const project=await projectWithKey({name:'Short wait',delivery:'wait',wait_seconds:1});
  const started=Date.now();
  const response=await owner.post('/v1/images/search',{query:'slow',count:'3'},{key:project.key});
  assert.equal(response.status,202);
  assert.equal(response.json.waited,true);
  assert.equal(response.json.status,'queued');
  assert.equal(response.json.images,undefined);
  assert.ok(Date.now()-started>=900,'it waited for the project’s limit');
});

test('a single request can skip or ask for a wait with the Prefer header',async()=>{
  const waiting=await projectWithKey({name:'Waits but async',delivery:'wait',wait_seconds:5});
  const started=Date.now();
  const quick=await owner.post('/v1/images/search',{query:'now',count:'1'},{key:waiting.key,headers:{prefer:'respond-async'}});
  assert.equal(quick.status,202);
  assert.equal(quick.json.waited,undefined);
  assert.ok(Date.now()-started<1000);

  const polling=await projectWithKey({name:'Polls'});
  const at=Date.now();
  const worker=finishSoon(nextJobId(polling.id,at));
  const waited=await owner.post('/v1/images/search',{query:'once',count:'3'},{key:polling.key,headers:{prefer:'wait=3'}});
  await worker;
  assert.equal(waited.status,200);
  assert.equal(waited.json.images.length,3);
});

test('the workspace playground never waits',async()=>{
  const project=await projectWithKey({name:'Playground waits',delivery:'wait',wait_seconds:3});
  const started=Date.now();
  const response=await owner.post('/api/search',{project_id:project.id,query:'quick',count:'1'});
  assert.equal(response.status,202);
  assert.ok(Date.now()-started<1000);
});

test('GET /v1/jobs/:id?wait=N waits for a running job',async()=>{
  const project=await projectWithKey({name:'Long poll'});
  const created=await owner.post('/v1/images/search',{query:'later',count:'2'},{key:project.key});
  const worker=finishSoon(Promise.resolve(created.json.job_id),{delay:400,images:2});
  const status=await owner.get(`/v1/jobs/${created.json.job_id}?wait=3`,{key:project.key});
  await worker;
  assert.equal(status.status,200);
  assert.equal(status.json.job.status,'complete');
  assert.equal((await owner.get(`/v1/jobs/${created.json.job_id}?wait=99`,{key:project.key})).status,400);
});

test('webhook delivery needs a URL and only webhook projects get events',async()=>{
  const missing=await owner.post('/api/projects',{name:'No URL',delivery:'webhook'});
  assert.equal(missing.status,400);
  assert.equal(missing.json.error.code,'INVALID_WEBHOOK_URL');

  const hooked=await projectWithKey({name:'Hooked',delivery:'webhook',webhook_url:'https://hooks.example.test/pluko'});
  assert.equal(hooked.created.delivery,'webhook');
  assert.match(hooked.created.webhook_secret,/^whsec_/);

  const job=await owner.post('/v1/images/search',{query:'events',count:'1'},{key:hooked.key});
  const view=()=>jobView(api.store.get('SELECT * FROM jobs WHERE id=?',job.json.job_id));
  assert.ok(enqueueJobFinished(view()),'a webhook project gets job.finished');

  const switched=await owner.post('/api/projects/delivery',{id:hooked.id,delivery:'poll'});
  assert.equal(switched.status,200);
  assert.equal(switched.json.webhook_url,'https://hooks.example.test/pluko','the URL is kept for switching back');
  assert.equal(enqueueJobFinished(view()),null,'no events once the project stops using webhooks');

  const back=await owner.post('/api/projects/delivery',{id:hooked.id,delivery:'webhook'});
  assert.equal(back.status,200);
  assert.equal(back.json.webhook_secret,null,'the existing secret is kept');
});

test('switching to webhook asks for a URL, and removing the webhook falls back to polling',async()=>{
  const project=await projectWithKey({name:'Switches'});
  const noUrl=await owner.post('/api/projects/delivery',{id:project.id,delivery:'webhook'});
  assert.equal(noUrl.json.error.code,'WEBHOOK_URL_REQUIRED');
  const withUrl=await owner.post('/api/projects/delivery',{id:project.id,delivery:'webhook',webhook_url:'https://hooks.example.test/switch'});
  assert.match(withUrl.json.webhook_secret,/^whsec_/,'a signing secret is shown once');
  await owner.post('/api/projects/webhook',{id:project.id,webhook_url:null});
  assert.equal(api.store.get('SELECT delivery FROM projects WHERE id=?',project.id).delivery,'poll');

  const wait=await owner.post('/api/projects/delivery',{id:project.id,delivery:'wait',wait_seconds:5});
  assert.deepEqual([wait.json.delivery,wait.json.wait_seconds],['wait',5]);
  assert.ok(api.store.get("SELECT 1 FROM audit WHERE action='project.delivery_changed' AND target=?",project.id));
  const listed=await owner.get('/api/projects?page=1&delivery=wait');
  assert.ok(listed.json.projects.some(p=>p.id===project.id&&p.wait_seconds===5));

  const stranger=api.client();
  await stranger.register('delivery-stranger@example.test');
  assert.equal((await stranger.post('/api/projects/delivery',{id:project.id,delivery:'poll'})).status,404);
});
