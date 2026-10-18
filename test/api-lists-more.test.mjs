import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());

const dana=api.client(),eve=api.client();
await dana.register('dana@example.test');
await eve.register('eve@example.test');
const shop=await dana.project('Dana shop');
const evesApp=await eve.project('Eve app');
const created=await dana.post('/v1/images/search',{query:'lamps',count:'5'},{key:shop.key});
const jobId=created.json.job_id;
const taskId=api.store.get('SELECT id FROM tasks WHERE job_id=?',jobId).id;
const image=(n,extra)=>({id:'img_'+n,query:'lamps',title:`Lamp ${n}`,image_url:`https://img.example/${n}.jpg`,source_domain:n%2?'lamps.example':'decor.example',width:n*400,height:800,watermark_hint:n===3?'source_or_title_signal':'not_assessed',...extra});
for(let n=1;n<=4;n++)api.store.run('INSERT INTO results(id,job_id,task_id,url,data) VALUES(?,?,?,?,?)','img_'+n,jobId,taskId,`https://img.example/${n}.jpg`,JSON.stringify(image(n)));

test('workspace result filters narrow a job’s images without changing /v1',async()=>{
  const all=await dana.get(`/api/jobs/${jobId}/results?limit=100&after=0`);
  assert.equal(all.json.images.length,4);
  assert.equal(all.json.total,4);
  const wide=await dana.get(`/api/jobs/${jobId}/results?limit=100&after=0&min_width=1500&orientation=landscape`);
  assert.deepEqual(wide.json.images.map(i=>i.id),['img_4']);
  assert.equal(wide.json.matching,1);
  assert.equal((await dana.get(`/api/jobs/${jobId}/results?limit=100&after=0&q=decor`)).json.images.length,2);
  assert.equal((await dana.get(`/api/jobs/${jobId}/results?limit=100&after=0&watermark=flagged`)).json.images[0].id,'img_3');
  assert.equal((await dana.get(`/api/jobs/${jobId}/results?limit=100&after=0&orientation=round`)).status,400);
  const publicApi=await dana.get(`/v1/jobs/${jobId}/results?limit=100&after=0&min_width=1200`,{key:shop.key});
  assert.equal(publicApi.json.images.length,4,'the public API ignores workspace-only filters');
  assert.equal(publicApi.json.total,undefined,'and its response shape is unchanged');
});

test('feedback lists are scoped and filter by status, reason and project',async()=>{
  await dana.post('/api/feedback',{job_id:jobId,result_id:'img_1',reason:'watermark',note:'big logo'});
  await dana.post('/api/feedback',{job_id:jobId,result_id:'img_2',reason:'broken'});
  const all=await dana.get('/api/feedback?page=1');
  assert.equal(all.json.total,2);
  assert.equal(all.json.feedback[0].project_name,'Dana shop');
  assert.ok(all.json.feedback[0].image,'each report carries its image');
  assert.equal((await dana.get('/api/feedback?page=1&reason=watermark')).json.total,1);
  assert.equal((await dana.get('/api/feedback?page=1&q=logo')).json.total,1);
  assert.equal((await dana.get(`/api/feedback?page=1&project_id=${shop.projectId}&status=open`)).json.total,2);
  assert.equal((await dana.get('/api/feedback?page=1&status=reviewed')).json.total,0);
  assert.equal((await eve.get('/api/feedback?page=1')).json.total,0,'never another customer’s reports');
  assert.equal((await dana.get('/api/feedback')).json.feedback.length,2,'the full list still works without a page');
});

test('webhook deliveries are paged per project and private to its owner',async()=>{
  api.store.run("INSERT INTO webhook_deliveries(id,project_id,job_id,event,payload,status,attempts,next_at,created) VALUES('whd_1',?,?,'job.finished','{}','delivered',1,0,?),('whd_2',?,?,'job.finished','{}','failed',5,0,?),('whd_3',?,?,'webhook.test','{}','pending',0,0,?)",
    shop.projectId,jobId,Date.now()-3000,shop.projectId,jobId,Date.now()-2000,shop.projectId,'',Date.now()-1000);
  const all=await dana.get(`/api/webhooks/deliveries?page=1&project_id=${shop.projectId}`);
  assert.equal(all.json.total,3);
  assert.equal(all.json.deliveries[0].id,'whd_3');
  assert.equal((await dana.get(`/api/webhooks/deliveries?page=1&project_id=${shop.projectId}&status=failed`)).json.deliveries[0].id,'whd_2');
  assert.equal((await dana.get(`/api/webhooks/deliveries?page=1&project_id=${shop.projectId}&event=webhook.test`)).json.total,1);
  assert.equal((await eve.get(`/api/webhooks/deliveries?page=1&project_id=${shop.projectId}`)).status,404);
  assert.equal((await eve.get(`/api/webhooks/deliveries?page=1&project_id=${evesApp.projectId}`)).json.total,0);
});

test('exports return every matching row and keep the request log small',async()=>{
  // More jobs than one page; inserted directly because each project may only queue a few at a time.
  const danaId=api.store.get("SELECT id FROM users WHERE email='dana@example.test'").id;
  for(let i=0;i<30;i++)api.store.run("INSERT INTO jobs(id,user_id,project_id,payload,status,created,updated) VALUES(?,?,?,'{}','complete',?,?)",'job_bulk'+i,danaId,shop.projectId,Date.now()-i,Date.now());
  // Pluko limits how many jobs can wait at once, so compare with what was actually accepted.
  const accepted=api.store.get('SELECT count(*) n FROM jobs WHERE project_id=?',shop.projectId).n;
  assert.ok(accepted>25,'more rows than one page');
  const exported=await dana.get('/api/jobs?page=1&export=1');
  assert.equal(exported.json.jobs.length,accepted);
  assert.equal(exported.json.page_size,10000);
  const logged=api.store.get("SELECT response FROM requests WHERE path='/api/jobs' ORDER BY rowid DESC LIMIT 1");
  assert.equal(logged.response,JSON.stringify({exported:true}));
  const lamps=await dana.get('/api/jobs?page=1&export=1&q=lamps');
  assert.equal(lamps.json.jobs.length,1,'exports honour filters');
});
