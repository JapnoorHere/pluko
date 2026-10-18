import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());
const {totp,newTotp,seal,passwordHash}=await import('../security.mjs');
const PASSWORD='correct horse battery staple';

async function adminClient(email){
  const secret=newTotp();
  api.store.run("INSERT INTO users(id,email,password,role,totp,created) VALUES(?,?,?,'admin',?,?)",'usr_'+email.split('@')[0].replace(/\W/g,''),email,await passwordHash(PASSWORD),seal(secret),Date.now());
  const admin=api.client();
  assert.equal((await admin.login(email,PASSWORD,{code:totp(secret),portal:'admin'})).status,200);
  return admin;
}

// Two customers with their own projects, keys, jobs and requests.
const alice=api.client(),bob=api.client();
await alice.register('alice-lists@example.test');
await bob.register('bob-lists@example.test');
const aliceShop=await alice.project('Shop');
const aliceBlog=await alice.project('Blog');
const bobApp=await bob.project('Bob app');
for(const query of ['red shoes','blue shoes','green hats'])await alice.post('/v1/images/search',{query,count:'5'},{key:aliceShop.key});
await alice.post('/v1/images/search',{query:'garden',count:'5'},{key:aliceBlog.key});
await bob.post('/v1/images/search',{query:'bob only',count:'5'},{key:bobApp.key});
await alice.get('/v1/usage',{key:aliceShop.key});
const admin=await adminClient('lists-admin@example.test');

test('requests without a page keep the old response shape',async()=>{
  const keys=await alice.get('/api/keys');
  assert.ok(Array.isArray(keys.json.keys));
  assert.equal(keys.json.total,undefined);
  const jobs=await alice.get('/api/jobs?limit=2');
  assert.equal(jobs.json.jobs.length,2);
  assert.ok('next_cursor' in jobs.json);
});

test('job lists are scoped, searchable, filterable and paginated',async()=>{
  const all=await alice.get('/api/jobs?page=1&page_size=10');
  assert.equal(all.status,200);
  assert.equal(all.json.total,4);
  assert.equal(all.json.jobs[0].project_name!==undefined,true);
  assert.equal(all.json.jobs.some(job=>job.queries[0].query==='bob only'),false,'never another customer’s jobs');
  assert.equal(all.json.jobs[0].user_email,undefined,'customers do not get owner emails');

  assert.equal((await alice.get('/api/jobs?page=1&q=shoes')).json.total,2,'search looks inside the job’s queries');
  assert.equal((await alice.get(`/api/jobs?page=1&project_id=${aliceBlog.projectId}`)).json.total,1);
  assert.equal((await alice.get('/api/jobs?page=1&status=queued,running,complete,partial,cancelled')).json.total,4);
  const paged=await alice.get('/api/jobs?page=2&page_size=10&sort=created_asc');
  assert.equal(paged.json.jobs.length,0);assert.equal(paged.json.has_more,false);
  assert.equal((await alice.get('/api/jobs?page=1&status=deleted')).status,400);
  assert.equal((await alice.get('/api/jobs?page=1&sort=evil')).status,400);
});

test('only administrators can filter by user, and they see every account',async()=>{
  const denied=await alice.get('/api/jobs?page=1&user_id=usr_x');
  assert.equal(denied.status,403);
  assert.equal(denied.json.error.code,'ADMIN_REQUIRED');
  const everyone=await admin.get('/api/jobs?page=1');
  assert.equal(everyone.json.total,5);
  const bobId=api.store.get("SELECT id FROM users WHERE email='bob-lists@example.test'").id;
  const bobs=await admin.get(`/api/jobs?page=1&user_id=${bobId}`);
  assert.equal(bobs.json.total,1);
  assert.equal(bobs.json.jobs[0].user_email,'bob-lists@example.test');
});

test('request logs filter by endpoint, status class, key and time',async()=>{
  const all=await alice.get('/api/logs?page=1&page_size=50');
  assert.equal(all.json.logs.every(log=>log.path.startsWith('/v1/')),true,'API calls only by default');
  assert.equal((await alice.get('/api/logs?page=1&endpoint=search')).json.total,4);
  assert.equal((await alice.get('/api/logs?page=1&endpoint=usage')).json.total,1);
  assert.equal((await alice.get(`/api/logs?page=1&key_id=${aliceBlog.keyId}`)).json.total,1);
  assert.equal((await alice.get('/api/logs?page=1&status=2xx')).json.total,5);
  assert.equal((await alice.get('/api/logs?page=1&status=4xx,500')).json.total,0);
  assert.equal((await alice.get(`/api/logs?page=1&created_from=${Date.now()+60000}`)).json.total,0);
  assert.equal((await alice.get('/api/logs?page=1&status=teapot')).status,400);
  assert.ok((await alice.get('/api/logs?page=1&source=all')).json.total>5,'everything includes workspace calls');
});

test('key lists filter by status, project, scope and use',async()=>{
  assert.equal((await alice.get('/api/keys?page=1')).json.total,2);
  assert.equal((await alice.get('/api/keys?page=1&used=never')).json.total,0);
  assert.equal((await alice.get('/api/keys?page=1&used=day')).json.total,2);
  assert.equal((await alice.get(`/api/keys?page=1&project_id=${aliceShop.projectId}&scope=search`)).json.total,1);
  await alice.post('/api/keys/revoke',{id:aliceBlog.keyId});
  assert.equal((await alice.get('/api/keys?page=1&status=revoked')).json.keys[0].id,aliceBlog.keyId);
  assert.equal((await alice.get('/api/keys?page=1&status=active')).json.total,1);
  api.store.run('UPDATE api_keys SET expires=? WHERE id=?',Date.now()+86400000,aliceShop.keyId);
  assert.equal((await alice.get('/api/keys?page=1&status=expiring')).json.total,1);
  assert.equal((await alice.get('/api/keys?page=1&q=test%20key&sort=name_asc')).json.total,2);
  assert.ok((await admin.get('/api/keys?page=1')).json.keys.every(key=>'owner' in key));
});

test('project lists filter by usage and webhook, and admins can search by owner',async()=>{
  const day=new Date().toISOString().slice(0,10);
  api.store.run('INSERT OR REPLACE INTO usage(project_id,day,pages) VALUES(?,?,?)',aliceShop.projectId,day,190);
  const near=await alice.get('/api/projects?page=1&usage=near');
  assert.deepEqual(near.json.projects.map(p=>p.name),['Shop']);
  assert.equal(near.json.projects[0].pages_today,190);
  assert.equal((await alice.get('/api/projects?page=1&usage=under')).json.total,1);
  assert.equal((await alice.get('/api/projects?page=1&webhook=yes')).json.total,0);
  assert.equal((await alice.get('/api/projects?page=1&sort=usage_desc')).json.projects[0].name,'Shop');
  assert.equal((await admin.get('/api/projects?page=1&q=bob-lists')).json.total,1);
  assert.equal((await alice.get('/api/projects?page=1&q=bob-lists')).json.total,0,'customers cannot search other owners');
});
