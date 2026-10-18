import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());
const {totp,newTotp,seal,passwordHash}=await import('../security.mjs');
const PASSWORD='correct horse battery staple';
const DAY=86400000;

const secret=newTotp();
api.store.run("INSERT INTO users(id,email,password,role,totp,created) VALUES('usr_boss','boss@example.test',?,'admin',?,?)",await passwordHash(PASSWORD),seal(secret),Date.now());
const admin=api.client();
assert.equal((await admin.login('boss@example.test',PASSWORD,{code:totp(secret),portal:'admin'})).status,200);

const carol=api.client();
await carol.register('carol@example.test');
const carolProject=await carol.project('Carol shop');
await carol.post('/v1/images/search',{query:'teapots',count:'5'},{key:carolProject.key});
const carolId=api.store.get("SELECT id FROM users WHERE email='carol@example.test'").id;
api.store.run("INSERT INTO users(id,email,password,role,created,active) VALUES('usr_idle','idle@example.test','x','user',?,0)",Date.now()-60*DAY);

test('customers cannot reach administrator lists',async()=>{
  for(const path of ['/api/admin/users?page=1','/api/admin/audit?page=1','/api/admin/waitlist?page=1','/api/admin/attempts?page=1',`/api/admin/users/${carolId}`]){
    assert.equal((await carol.get(path)).status,403,path);
  }
});

test('users filter by role, status, two-step, activity and projects',async()=>{
  const all=await admin.get('/api/admin/users?page=1');
  assert.equal(all.json.total,3);
  assert.equal(typeof all.json.users[0].mfa,'boolean');
  assert.equal((await admin.get('/api/admin/users?page=1&role=admin')).json.users[0].email,'boss@example.test');
  assert.equal((await admin.get('/api/admin/users?page=1&status=suspended')).json.users[0].email,'idle@example.test');
  assert.equal((await admin.get('/api/admin/users?page=1&mfa=off')).json.total,2);
  assert.equal((await admin.get('/api/admin/users?page=1&active_within=day')).json.total,2,'login and sign-up both count as activity');
  assert.equal((await admin.get('/api/admin/users?page=1&active_within=never')).json.users[0].email,'idle@example.test');
  assert.equal((await admin.get('/api/admin/users?page=1&has_projects=yes')).json.users[0].email,'carol@example.test');
  assert.equal((await admin.get(`/api/admin/users?page=1&created_to=${Date.now()-30*DAY}`)).json.total,1);
  assert.equal((await admin.get('/api/admin/users?page=1&q=CAROL')).json.total,1,'email search ignores case');
  assert.equal((await admin.get('/api/admin/users?page=1&sort=jobs_desc')).json.users[0].email,'carol@example.test');
  assert.equal((await admin.get('/api/admin/users')).json.users.length,3,'the full list still works without a page');
});

test('a user page summarises one account',async()=>{
  const page=await admin.get(`/api/admin/users/${carolId}`);
  assert.equal(page.status,200);
  assert.equal(page.json.user.email,'carol@example.test');
  assert.equal(page.json.stats.projects,1);
  assert.equal(page.json.stats.jobs,1);
  assert.equal(page.json.stats.requests_30d,1);
  assert.equal(page.json.stats.active_keys,1);
  assert.equal((await admin.get('/api/admin/users/usr_nobody')).status,404);
  // The account's own lists come from the shared endpoints with a user filter.
  assert.equal((await admin.get(`/api/jobs?page=1&user_id=${carolId}`)).json.total,1);
  assert.equal((await admin.get(`/api/keys?page=1&user_id=${carolId}`)).json.total,1);
});

test('audit history filters by area, account and time',async()=>{
  const areas=await admin.get('/api/admin/audit/areas');
  assert.ok(areas.json.areas.includes('key'));
  assert.ok(areas.json.areas.includes('project'));
  const keys=await admin.get('/api/admin/audit?page=1&area=key');
  assert.ok(keys.json.audit.length>0);
  assert.ok(keys.json.audit.every(row=>row.action.startsWith('key.')));
  const carols=await admin.get(`/api/admin/audit?page=1&user=${carolId}`);
  assert.ok(carols.json.audit.every(row=>row.actor===carolId||row.target===carolId));
  assert.equal(carols.json.audit.find(row=>row.actor===carolId)?.actor_email,'carol@example.test');
  assert.equal((await admin.get(`/api/admin/audit?page=1&created_from=${Date.now()+DAY}`)).json.total,0);
  assert.equal((await admin.get('/api/admin/audit?page=1&area=key%25')).status,400,'area names are validated');
  assert.equal((await admin.get('/api/admin/audit?page=1&q=project.created')).json.total,1);
});

test('waitlist pages, searches and keeps the export shape without a page',async()=>{
  for(const email of ['amy@example.test','ben@example.test','cleo@example.test'])
    await api.client().post('/api/waitlist',{email},{headers:{origin:api.base}});
  const page=await admin.get('/api/admin/waitlist?page=1&page_size=10&sort=email_asc');
  assert.deepEqual(page.json.entries.map(entry=>entry.email),['amy@example.test','ben@example.test','cleo@example.test']);
  assert.equal((await admin.get('/api/admin/waitlist?page=1&q=ben')).json.total,1);
  const exported=await admin.get('/api/admin/waitlist');
  assert.equal(exported.json.entries.length,3);
  assert.equal(exported.json.truncated,false);
});

test('provider attempts filter by outcome and job',async()=>{
  api.store.run("INSERT INTO attempts(job_id,task_id,provider,page,status,duration,candidates,accepted,error,created) VALUES('job_a','t1','bing',1,'ok',800,35,30,NULL,?),('job_a','t1','bing',2,'error',12000,0,0,'timeout',?),('job_b','t2','bing',1,'ok',200,35,0,NULL,?)",Date.now(),Date.now(),Date.now());
  assert.equal((await admin.get('/api/admin/attempts?page=1&status=error')).json.attempts[0].error,'timeout');
  assert.equal((await admin.get('/api/admin/attempts?page=1&job_id=job_a')).json.total,2);
  assert.equal((await admin.get('/api/admin/attempts?page=1&speed=very_slow')).json.total,1);
  assert.equal((await admin.get('/api/admin/attempts?page=1&yield=none&status=ok')).json.attempts[0].job_id,'job_b');
  assert.equal((await admin.get('/api/admin/attempts?page=1&q=timeout')).json.total,1);
});

test('quick lookup finds accounts, jobs and keys, scoped to the viewer',async()=>{
  const forAdmin=await admin.get('/api/lookup?q=carol');
  assert.equal(forAdmin.json.users[0].email,'carol@example.test');
  const teapots=await carol.get('/api/lookup?q=teapot');
  assert.equal(teapots.json.jobs.length,1);
  assert.equal(teapots.json.users.length,0,'customers never get account results');
  const keyPrefix=api.store.get('SELECT prefix FROM api_keys LIMIT 1').prefix;
  assert.equal((await carol.get(`/api/lookup?q=${keyPrefix.slice(0,12)}`)).json.keys.length,1);
  const stranger=api.client();
  await stranger.register('stranger@example.test');
  assert.equal((await stranger.get('/api/lookup?q=teapot')).json.jobs.length,0,'never another customer’s jobs');
  assert.equal((await carol.get('/api/lookup?q=t')).json.jobs.length,0,'one character is too short to search');
});
