import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';
import {createMockProvider} from '../providers.mjs';

const api=await startApi();
test.after(()=>api.close());
const {tick}=await import('../jobs.mjs');

// Runs the worker until nothing is left to do. Page results normally wait one second; skip that wait.
async function drain(provider,max=60) {
  for(let index=0;index<max;index++){
    api.store.run('UPDATE tasks SET next_at=0');
    if(!await tick('test-worker',provider))return index;
  }
  throw new Error('worker did not settle');
}
async function setup(email) {
  const client=api.client();
  await client.register(email);
  return {client,...await client.project('Worker tests')};
}
const results=async(client,key,job)=>{
  const rows=[];let after=0;
  for(;;){
    const page=await client.get(`/v1/jobs/${job}/results?limit=100&after=${after}`,{key});
    rows.push(...page.json.images);
    if(page.json.next_cursor===null)return rows;
    after=page.json.next_cursor;
  }
};

test('a job collects the requested number of unique images and completes',async()=>{
  const {client,key}=await setup('worker-complete@example.test');
  const created=await client.post('/v1/images/search',{query:'red car',count:'50'},{key});
  const provider=createMockProvider();
  await drain(provider);
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.equal(job.status,'complete');
  assert.equal(job.returned,50);
  assert.equal(job.queries[0].reason,'requested_count_reached');
  const rows=await results(client,key,created.json.job_id);
  assert.equal(rows.length,50);
  assert.equal(new Set(rows.map(row=>row.image_url)).size,50);
  assert.equal(rows[0].provider,'mock');
  assert.ok(rows.every(row=>row.width>=800),'default minimum width is applied');
  assert.equal(api.store.get('SELECT count(*) n FROM attempts WHERE job_id=?',created.json.job_id).n>=2,true);
});

test('a job that outruns the source finishes partial and says so',async()=>{
  const {client,key}=await setup('worker-partial@example.test');
  const created=await client.post('/v1/images/search',{query:'rare thing',count:'500'},{key});
  await drain(createMockProvider());
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.equal(job.status,'partial');
  assert.equal(job.returned,70);
  assert.equal(job.queries[0].reason,'source_exhausted_or_no_new_matches');
});

test('filters reach the provider and defaults are not stored',async()=>{
  const {client,key}=await setup('worker-filters@example.test');
  const seen=[],base=createMockProvider();
  const recording={name:'mock',fetchPage:(query,page,filters)=>{seen.push(filters);return base.fetchPage(query,page,filters);}};
  const plain=await client.post('/v1/images/search',{query:'plain'},{key});
  const filtered=await client.post('/v1/images/search',{query:'fancy',image_type:'photo',layout:'wide',safe_search:'strict',size:'any'},{key});
  await drain(recording);
  const plainJob=(await client.get(`/v1/jobs/${plain.json.job_id}`,{key})).json.job;
  assert.deepEqual(Object.keys(plainJob.filters).sort(),['exclude_domains','min_width','queries','watermark_policy']);
  const filteredJob=(await client.get(`/v1/jobs/${filtered.json.job_id}`,{key})).json.job;
  assert.equal(filteredJob.filters.image_type,'photo');
  assert.equal(filteredJob.filters.layout,'wide');
  assert.equal(filteredJob.filters.safe_search,'strict');
  assert.equal('size' in filteredJob.filters,false);
  assert.ok(seen.some(filters=>filters.image_type==='photo'&&filters.safe_search==='strict'));
});

test('invalid filters are rejected before a job exists',async()=>{
  const {client,key}=await setup('worker-invalid@example.test');
  for(const body of [{query:'x',safe_search:'off'},{query:'x',image_type:'video'},{query:'x',color:'ultraviolet'}]){
    const response=await client.post('/v1/images/search',body,{key});
    assert.equal(response.status,400);
    assert.equal(response.json.error.code,'INVALID_FILTER');
  }
  assert.equal((await client.get('/v1/jobs',{key})).json.jobs.length,0);
});

test('excluded domains and minimum width are respected',async()=>{
  const {client,key}=await setup('worker-exclude@example.test');
  const created=await client.post('/v1/images/search',{query:'filtered',count:'40',min_width:1200,exclude_domains:['images-1.example.test']},{key});
  await drain(createMockProvider());
  const rows=await results(client,key,created.json.job_id);
  assert.ok(rows.length>0);
  assert.ok(rows.every(row=>row.width>=1200));
  assert.ok(rows.every(row=>row.source_domain!=='images-1.example.test'));
});

test('the daily page limit stops a job as partial',async()=>{
  const {client,key,projectId}=await setup('worker-quota@example.test');
  api.store.run('UPDATE projects SET daily_pages=1 WHERE id=?',projectId);
  const created=await client.post('/v1/images/search',{query:'quota',count:'100'},{key});
  await drain(createMockProvider());
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.equal(job.status,'partial');
  assert.equal(job.queries[0].reason,'daily_page_quota');
  assert.ok(job.returned>0&&job.returned<100);
  const usage=await client.get('/v1/usage',{key});
  assert.equal(usage.json.pages_used,1);
  assert.equal(usage.json.pages_remaining,0);
});

test('a failing source is retried and then reported as failed',async()=>{
  const {client,key}=await setup('worker-fail@example.test');
  const created=await client.post('/v1/images/search',{query:'broken source',count:'10'},{key});
  await drain(createMockProvider({fail:true}));
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.equal(job.status,'partial');
  assert.equal(job.queries[0].reason,'provider_failed');
  assert.equal(api.store.get("SELECT count(*) n FROM attempts WHERE job_id=? AND status='error'",created.json.job_id).n,3);
});

test('a cancelled job stops and finds nothing',async()=>{
  const {client,key}=await setup('worker-cancel@example.test');
  const created=await client.post('/v1/images/search',{query:'cancel me',count:'50'},{key});
  assert.equal((await client.post(`/v1/jobs/${created.json.job_id}/cancel`,{},{key})).status,200);
  assert.equal(await drain(createMockProvider()),0,'there is no work left to claim');
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.equal(job.status,'cancelled');
  assert.equal(job.returned,0);
});

test('pausing the provider holds work until it is resumed',async()=>{
  const {client,key}=await setup('worker-pause@example.test');
  const created=await client.post('/v1/images/search',{query:'pause test',count:'10'},{key});
  api.store.run("UPDATE settings SET value='false' WHERE key='provider_enabled'");
  assert.equal(await tick('test-worker',createMockProvider()),false);
  assert.equal((await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job.status,'queued');
  api.store.run("UPDATE settings SET value='true' WHERE key='provider_enabled'");
  await drain(createMockProvider());
  assert.equal((await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job.status,'complete');
});

test('result pages are cursor based and a finished job shows when it expires',async()=>{
  const {client,key}=await setup('worker-pages@example.test');
  const created=await client.post('/v1/images/search',{query:'paging',count:'30'},{key});
  await drain(createMockProvider());
  const first=await client.get(`/v1/jobs/${created.json.job_id}/results?limit=10`,{key});
  assert.equal(first.json.images.length,10);
  assert.ok(first.json.next_cursor);
  const second=await client.get(`/v1/jobs/${created.json.job_id}/results?limit=10&after=${first.json.next_cursor}`,{key});
  assert.equal(second.json.images.length,10);
  assert.notEqual(second.json.images[0].id,first.json.images[0].id);
  const job=(await client.get(`/v1/jobs/${created.json.job_id}`,{key})).json.job;
  assert.ok(job.expires>Date.now(),'finished jobs report when their results are removed');
  const waiting=await client.post('/v1/images/search',{query:'still waiting'},{key});
  assert.equal((await client.get(`/v1/jobs/${waiting.json.job_id}`,{key})).json.job.expires,null);
});

test('repeating a request with the same idempotency key reuses the job',async()=>{
  const {client,key}=await setup('worker-idem@example.test');
  const headers={'idempotency-key':'same-request-1'};
  const first=await client.post('/v1/images/search',{query:'idem',count:'5'},{key,headers});
  const second=await client.post('/v1/images/search',{query:'idem',count:'5'},{key,headers});
  assert.equal(second.json.job_id,first.json.job_id);
  assert.equal(second.json.reused,true);
  const conflict=await client.post('/v1/images/search',{query:'different',count:'5'},{key,headers});
  assert.equal(conflict.status,409);
});
