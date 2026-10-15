import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());

test('usage endpoint reports pages used against the daily limit',async()=>{
  const owner=api.client();
  await owner.register('usage-owner@example.test');
  const {projectId,key}=await owner.project('Shop');

  const fresh=await owner.get('/v1/usage',{key});
  assert.equal(fresh.status,200);
  assert.equal(fresh.json.project_id,projectId);
  assert.equal(fresh.json.pages_used,0);
  assert.equal(fresh.json.pages_quota,200);
  assert.equal(fresh.json.pages_remaining,200);
  assert.equal(fresh.json.images_per_page,35);
  assert.ok(fresh.json.request_id);

  const day=new Date().toISOString().slice(0,10);
  api.store.run('INSERT INTO usage(project_id,day,pages) VALUES(?,?,?)',projectId,day,42);
  const used=await owner.get('/v1/usage',{key});
  assert.equal(used.json.pages_used,42);
  assert.equal(used.json.pages_remaining,158);
  assert.equal(used.json.history[0].pages,42);

  const dashboard=await owner.get('/api/usage');
  assert.equal(dashboard.status,200);
  assert.equal(dashboard.json.projects.length,1);
  assert.equal(dashboard.json.projects[0].pages_used,42);
});

test('usage is private to the account that owns the project',async()=>{
  const other=api.client();
  await other.register('usage-other@example.test');
  const list=await other.get('/api/usage');
  assert.equal(list.json.projects.length,0);
  const anonymous=await api.client().get('/api/usage');
  assert.equal(anonymous.status,401);
  const badKey=await other.get('/v1/usage',{key:'plk_live_not-a-real-key'});
  assert.equal(badKey.status,401);
});

test('jobs can be listed with a key, filtered by status and paged by cursor',async()=>{
  const owner=api.client();
  await owner.register('jobs-owner@example.test');
  const {key}=await owner.project('Catalog');
  const ids=[];
  for(const query of ['red car','blue boat','green tree']){
    const created=await owner.post('/v1/images/search',{query,count:'5'},{key});
    assert.equal(created.status,202);
    ids.push(created.json.job_id);
  }
  const first=await owner.get('/v1/jobs?limit=2',{key});
  assert.equal(first.status,200);
  assert.equal(first.json.jobs.length,2);
  assert.equal(first.json.jobs[0].id,ids[2]);
  assert.equal(first.json.jobs[0].queries[0].query,'green tree');
  assert.ok(first.json.next_cursor);
  const second=await owner.get(`/v1/jobs?limit=2&before=${first.json.next_cursor}`,{key});
  assert.equal(second.json.jobs.length,1);
  assert.equal(second.json.jobs[0].id,ids[0]);
  assert.equal(second.json.next_cursor,null);

  const queued=await owner.get('/v1/jobs?status=queued',{key});
  assert.equal(queued.json.jobs.length,3);
  const complete=await owner.get('/v1/jobs?status=complete',{key});
  assert.equal(complete.json.jobs.length,0);
  const invalid=await owner.get('/v1/jobs?status=bogus',{key});
  assert.equal(invalid.status,400);
});

test('a key only lists jobs from its own project, and dashboards list only the owner’s jobs',async()=>{
  const owner=api.client();
  await owner.register('jobs-scope@example.test');
  const a=await owner.project('A'),b=await owner.project('B');
  await owner.post('/v1/images/search',{query:'only in a'},{key:a.key});
  await owner.post('/v1/images/search',{query:'only in b'},{key:b.key});
  const listA=await owner.get('/v1/jobs',{key:a.key});
  assert.deepEqual(listA.json.jobs.map(job=>job.queries[0].query),['only in a']);
  const dashboard=await owner.get('/api/jobs');
  assert.equal(dashboard.json.jobs.length,2);
  const stranger=api.client();
  await stranger.register('jobs-stranger@example.test');
  assert.equal((await stranger.get('/api/jobs')).json.jobs.length,0);
});

test('signup is limited per network, not only per email',async()=>{
  let blocked=null;
  for(let index=0;index<8&&!blocked;index++){
    const response=await api.client('203.0.113.9').post('/api/register',{email:`flood-${index}@example.test`,password:'correct horse battery staple'});
    if(response.status===429)blocked=response;
  }
  assert.ok(blocked,'expected a SIGNUP_RATE_LIMIT response');
  assert.equal(blocked.json.error.code,'SIGNUP_RATE_LIMIT');
});
