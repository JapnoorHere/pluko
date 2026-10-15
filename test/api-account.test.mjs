import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());
const {totp,newTotp,seal,passwordHash}=await import('../security.mjs');
const {deviceLabel}=await import('../account.mjs');
const PASSWORD='correct horse battery staple';

test('device labels are short and safe for unknown agents',()=>{
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'),'Chrome on Windows');
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1'),'Safari on iOS');
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36'),'Chrome on Android');
  assert.equal(deviceLabel('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'),'Firefox on Linux');
  assert.equal(deviceLabel(''),'Unknown device');
  assert.equal(deviceLabel(undefined),'Unknown device');
});

test('sessions are listed with a label, and other sessions can be signed out individually',async()=>{
  const email='sessions@example.test';
  const first=api.client();
  await first.register(email);
  const second=api.client();
  await second.login(email,PASSWORD,{});
  const list=await first.get('/api/sessions');
  assert.equal(list.status,200);
  assert.equal(list.json.sessions.length,2);
  assert.equal(list.json.sessions.filter(session=>session.current).length,1);
  const other=list.json.sessions.find(session=>!session.current);
  assert.ok(other.id&&other.id.length===12);
  assert.ok(other.label);

  const self=list.json.sessions.find(session=>session.current);
  assert.equal((await first.post('/api/sessions/revoke',{id:self.id})).status,404,'the current session is ended by signing out, not here');
  assert.equal((await first.post('/api/sessions/revoke',{id:other.id})).status,200);
  assert.equal((await second.get('/api/projects')).status,401);
  assert.equal((await first.get('/api/projects')).status,200);
  assert.equal((await first.post('/api/sessions/revoke',{id:'does-not-exist'})).status,404);
});

test('a customer can turn authenticator protection on and off',async()=>{
  const email='mfa-customer@example.test';
  const client=api.client();
  await client.register(email);
  const setup=await client.post('/api/mfa/setup',{});
  assert.equal(setup.status,200);
  const secret=setup.json.secret;
  assert.equal((await client.post('/api/mfa/enable',{code:totp(secret)})).status,200);
  assert.equal((await client.get('/api/me')).json.user.mfa,true);

  // Sign-in now needs a code.
  api.store.run('UPDATE users SET last_totp=-1 WHERE email=?',email);
  const fresh=api.client();
  const noCode=await fresh.login(email);
  assert.equal(noCode.status,401);
  const withCode=await fresh.login(email,PASSWORD,{code:totp(secret)});
  assert.equal(withCode.status,200);

  // Disabling needs the password and a fresh code.
  api.store.run('UPDATE users SET last_totp=-1 WHERE email=?',email);
  assert.equal((await client.post('/api/mfa/disable',{password:'wrong password here',code:totp(secret)})).status,401);
  assert.equal((await client.post('/api/mfa/disable',{password:PASSWORD,code:'000000'})).status,401);
  assert.equal((await client.post('/api/mfa/disable',{password:PASSWORD,code:totp(secret)})).status,200);
  assert.equal((await client.get('/api/me')).json.user.mfa,false);
});

test('administrators cannot switch their authenticator off',async()=>{
  const email='admin-mfa@example.test',secret=newTotp();
  api.store.run("INSERT INTO users(id,email,password,role,totp,created) VALUES('usr_adminmfa',?,?,'admin',?,?)",email,await passwordHash(PASSWORD),seal(secret),Date.now());
  const admin=api.client();
  assert.equal((await admin.login(email,PASSWORD,{code:totp(secret),portal:'admin'})).status,200);
  api.store.run('UPDATE users SET last_totp=-1 WHERE email=?',email);
  const attempt=await admin.post('/api/mfa/disable',{password:PASSWORD,code:totp(secret)});
  assert.equal(attempt.status,403);
  assert.equal(attempt.json.error.code,'ADMIN_MFA_REQUIRED');
});

test('account export contains the user’s data but never secrets',async()=>{
  const client=api.client();
  await client.register('export@example.test');
  const {key,projectId}=await client.project('Export me');
  await client.post('/v1/images/search',{query:'export query',count:'3'},{key});
  const exported=await client.get('/api/account/export');
  assert.equal(exported.status,200);
  const data=exported.json.export;
  assert.equal(data.account.email,'export@example.test');
  assert.equal(data.projects[0].id,projectId);
  assert.equal(data.api_keys.length,1);
  assert.deepEqual(data.api_keys[0].scopes,['search','read']);
  assert.equal(data.jobs[0].payload.queries[0].query,'export query');
  assert.equal(exported.text.includes(key),false,'API key secret must not be exported');
  assert.equal(exported.text.includes('scrypt'),false);
  assert.equal(/"password"|"hash"|webhook_secret/.test(exported.text),false);
  assert.equal((await api.client().get('/api/account/export')).status,401);
});

test('deleting an account needs the password and removes all of its data',async()=>{
  const email='delete-me@example.test';
  const client=api.client();
  await client.register(email);
  const {key,projectId}=await client.project('Doomed');
  const job=await client.post('/v1/images/search',{query:'to be deleted'},{key});
  const userId=api.store.get('SELECT id FROM users WHERE email=?',email).id;

  assert.equal((await client.post('/api/account/delete',{password:PASSWORD})).status,400,'confirmation is required');
  assert.equal((await client.post('/api/account/delete',{password:'not the password!!',confirm:'DELETE'})).status,401);
  const done=await client.post('/api/account/delete',{password:PASSWORD,confirm:'DELETE'});
  assert.equal(done.status,200);

  assert.equal(api.store.get('SELECT count(*) n FROM users WHERE id=?',userId).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM projects WHERE id=?',projectId).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM jobs WHERE id=?',job.json.job_id).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM tasks WHERE job_id=?',job.json.job_id).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM api_keys WHERE project_id=?',projectId).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM requests WHERE user_id=?',userId).n,0);
  assert.equal(api.store.get('SELECT count(*) n FROM audit WHERE actor=? OR target=?',userId,userId).n,0);
  assert.ok(api.store.get("SELECT count(*) n FROM audit WHERE action='account.deleted'").n>=1);

  assert.equal((await api.client().get('/v1/jobs',{key})).status,401,'its API key stops working');
  assert.equal((await api.client().login(email)).status,401,'it can no longer sign in');
  assert.equal((await client.get('/api/me')).status,401,'its session is gone');
});

test('the last administrator cannot be deleted',async()=>{
  const email='only-admin@example.test',secret=newTotp();
  api.store.run("INSERT INTO users(id,email,password,role,totp,created) VALUES('usr_onlyadmin',?,?,'admin',?,?)",email,await passwordHash(PASSWORD),seal(secret),Date.now());
  api.store.run("UPDATE users SET active=0 WHERE role='admin' AND id<>'usr_onlyadmin'");
  const admin=api.client();
  assert.equal((await admin.login(email,PASSWORD,{code:totp(secret),portal:'admin'})).status,200);
  api.store.run('UPDATE users SET last_totp=-1 WHERE email=?',email);
  const attempt=await admin.post('/api/account/delete',{password:PASSWORD,confirm:'DELETE',code:totp(secret)});
  assert.equal(attempt.status,409);
  assert.equal(attempt.json.error.code,'LAST_ADMIN');
});

test('projects can be renamed and deleted by their owner only',async()=>{
  const owner=api.client();
  await owner.register('projects@example.test');
  const {projectId,key}=await owner.project('Old name');
  assert.equal((await owner.post('/api/projects/rename',{id:projectId,name:'  '})).status,400);
  assert.equal((await owner.post('/api/projects/rename',{id:projectId,name:'New name'})).status,200);
  assert.equal((await owner.get('/api/projects')).json.projects[0].name,'New name');

  const stranger=api.client();
  await stranger.register('projects-stranger@example.test');
  assert.equal((await stranger.post('/api/projects/rename',{id:projectId,name:'Hijack'})).status,404);
  assert.equal((await stranger.post('/api/projects/delete',{id:projectId,confirm:'New name'})).status,404);

  assert.equal((await owner.post('/api/projects/delete',{id:projectId,confirm:'wrong'})).status,400);
  await owner.post('/v1/images/search',{query:'cleanup check'},{key});
  assert.equal((await owner.post('/api/projects/delete',{id:projectId,confirm:'New name'})).status,200);
  assert.equal((await owner.get('/api/projects')).json.projects.length,0);
  assert.equal((await owner.get('/v1/jobs',{key})).status,401,'keys of a deleted project stop working');
  assert.equal(api.store.get('SELECT count(*) n FROM jobs WHERE project_id=?',projectId).n,0);
});

test('keys can be renamed and rotated; the old secret stops working',async()=>{
  const owner=api.client();
  await owner.register('keys@example.test');
  const {keyId,key}=await owner.project('Keys');
  assert.equal((await owner.post('/api/keys/rename',{id:keyId,name:'Production'})).status,200);
  const listed=await owner.get('/api/keys');
  assert.equal(listed.json.keys[0].name,'Production');

  const rotated=await owner.post('/api/keys/rotate',{id:keyId});
  assert.equal(rotated.status,201);
  assert.notEqual(rotated.json.secret,key);
  assert.equal((await owner.get('/v1/usage',{key})).status,401);
  assert.equal((await owner.get('/v1/usage',{key:rotated.json.secret})).status,200);
  const after=await owner.get('/api/keys');
  const fresh=after.json.keys.find(item=>item.id===rotated.json.id);
  assert.equal(fresh.name,'Production');
  assert.equal(fresh.scopes,'["search","read"]');
  assert.equal(after.json.keys.find(item=>item.id===keyId).revoked,1);
  assert.equal((await owner.post('/api/keys/rotate',{id:keyId})).status,409,'a revoked key cannot be rotated');

  const stranger=api.client();
  await stranger.register('keys-stranger@example.test');
  assert.equal((await stranger.post('/api/keys/rotate',{id:rotated.json.id})).status,404);
  assert.equal((await stranger.post('/api/keys/rename',{id:rotated.json.id,name:'x'})).status,404);
});

test('project listings never include webhook secrets',async()=>{
  const owner=api.client();
  await owner.register('leak-check@example.test');
  const {projectId}=await owner.project('Leak check');
  api.store.run('UPDATE projects SET webhook_secret=? WHERE id=?','SEALED-SECRET-VALUE',projectId);
  const listed=await owner.get('/api/projects');
  assert.equal(listed.text.includes('SEALED-SECRET-VALUE'),false);
  assert.equal('webhook_secret' in listed.json.projects[0],false);
});
