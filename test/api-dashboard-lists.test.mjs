import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';
import {createMockProvider} from '../providers.mjs';

const api=await startApi();
test.after(()=>api.close());
const {tick}=await import('../jobs.mjs');
const {openApiDocument}=await import('../openapi.mjs');

async function drain(provider=createMockProvider(),max=60) {
  for(let index=0;index<max;index++){
    api.store.run('UPDATE tasks SET next_at=0');
    if(!await tick('test-worker',provider))return;
  }
  throw new Error('worker did not settle');
}

test('request logs filter by an exact status or a status class',async()=>{
  const client=api.client();
  await client.register('logs-owner@example.test');
  await client.get('/api/projects');
  await client.get('/api/jobs/job_missing');

  const errors=await client.get('/api/logs?source=all&status=4xx');
  assert.equal(errors.status,200);
  assert.ok(errors.json.logs.length>0);
  assert.ok(errors.json.logs.every(row=>row.status>=400&&row.status<500));

  const ok=await client.get('/api/logs?source=all&status=2xx');
  assert.ok(ok.json.logs.length>0);
  assert.ok(ok.json.logs.every(row=>row.status>=200&&row.status<300));

  const exact=await client.get('/api/logs?source=all&status=404');
  assert.ok(exact.json.logs.length>0);
  assert.ok(exact.json.logs.every(row=>row.status===404));

  assert.equal((await client.get('/api/logs?status=9xx')).status,400);
  assert.equal((await client.get('/api/logs?status=4XX')).status,400);
});

test('feedback lists include the reported image, and only for its owner',async()=>{
  const owner=api.client();
  await owner.register('feedback-owner@example.test');
  const {key}=await owner.project('Feedback');
  const created=await owner.post('/v1/images/search',{query:'red bicycle',count:'5'},{key});
  assert.equal(created.status,202);
  await drain();
  const results=await owner.get(`/v1/jobs/${created.json.job_id}/results`,{key});
  const first=results.json.images[0];
  assert.ok(first);

  const sent=await owner.post('/api/feedback',{job_id:created.json.job_id,result_id:first.id,reason:'watermark',note:'Logo in the corner'});
  assert.equal(sent.status,201);

  const list=await owner.get('/api/feedback');
  const row=list.json.feedback.find(item=>item.id===sent.json.id);
  assert.equal(row.reason,'watermark');
  assert.equal(row.result_data,undefined);
  assert.equal(row.image.image_url,first.image_url);
  assert.equal(row.image.thumbnail_url,first.thumbnail_url??null);
  assert.equal(row.image.source_domain,first.source_domain);
  for(const field of openApiDocument(api.base).components.schemas.FeedbackItem.required)assert.ok(field in row,'documented feedback field missing: '+field);

  const apiList=await owner.get('/v1/feedback',{key});
  assert.equal(apiList.status,200);
  assert.ok(apiList.json.feedback.some(item=>item.id===sent.json.id&&item.image?.image_url===first.image_url));

  const stranger=api.client();
  await stranger.register('feedback-stranger@example.test');
  const theirs=await stranger.get('/api/feedback');
  assert.equal(theirs.json.feedback.length,0);

  // Once retention removes the result, the report stays and the image becomes null.
  api.store.run('DELETE FROM results WHERE id=?',first.id);
  const after=await owner.get('/api/feedback');
  assert.equal(after.json.feedback.find(item=>item.id===sent.json.id).image,null);
});

test('request logs show API calls by default, dashboard activity only on request',async()=>{
  const client=api.client();
  await client.register('logs-source@example.test');
  const {key}=await client.project('Log source');
  await client.get('/api/projects');
  await client.get('/api/usage');
  await client.post('/v1/images/search',{query:'log source',count:'5'},{key});
  await client.get('/v1/usage',{key});

  const byDefault=await client.get('/api/logs');
  assert.equal(byDefault.status,200);
  assert.ok(byDefault.json.logs.length>=2);
  assert.ok(byDefault.json.logs.every(row=>row.path.startsWith('/v1/')),'only API requests by default');
  assert.ok(byDefault.json.logs.some(row=>row.path==='/v1/images/search'&&row.method==='POST'));

  const everything=await client.get('/api/logs?source=all');
  assert.ok(everything.json.logs.some(row=>row.path==='/api/projects'),'dashboard requests are available on request');
  assert.ok(everything.json.logs.length>byDefault.json.logs.length);

  assert.equal((await client.get('/api/logs?source=dashboard')).status,400);
  const other=api.client();
  await other.register('logs-source-other@example.test');
  assert.equal((await other.get('/api/logs')).json.logs.length,0,'nobody sees another account’s calls');
});

test('the overview counts only API calls, not the dashboard’s own requests',async()=>{
  const client=api.client();
  await client.register('overview-count@example.test');
  const {key}=await client.project('Counter');
  for(let index=0;index<5;index++)await client.get('/api/projects');
  const before=(await client.get('/api/overview')).json.requests.total;
  assert.equal(before,0,'dashboard traffic is not counted');
  await client.get('/v1/usage',{key});
  await client.get('/v1/jobs',{key});
  const after=(await client.get('/api/overview')).json.requests;
  assert.equal(after.total,2);
  assert.equal(after.errors??0,0);
});
