import test from 'node:test';
import assert from 'node:assert/strict';
import {startApi} from './helpers/api-harness.mjs';

const api=await startApi();
test.after(()=>api.close());
const {totp,newTotp,seal,passwordHash}=await import('../security.mjs');
const {waitlistToCsv}=await import('../lib/display.js');
const PASSWORD='correct horse battery staple';

// Browser requests from the coming-soon page carry the site's own Origin.
const sameOrigin={headers:{origin:api.base}};
const join=(client,body)=>client.post('/api/waitlist',body,sameOrigin);

async function adminClient(email){
  const secret=newTotp();
  api.store.run("INSERT INTO users(id,email,password,role,totp,created) VALUES(?,?,?,'admin',?,?)",'usr_'+email.split('@')[0].replace(/\W/g,''),email,await passwordHash(PASSWORD),seal(secret),Date.now());
  const admin=api.client();
  assert.equal((await admin.login(email,PASSWORD,{code:totp(secret),portal:'admin'})).status,200);
  return admin;
}
const setPrelaunch=on=>api.store.run("UPDATE settings SET value=? WHERE key='prelaunch_enabled'",String(on));

test('the migration adds the waitlist and leaves pre-launch mode off',()=>{
  assert.equal(api.store.setting('prelaunch_enabled'),'false');
  assert.ok(api.store.get('SELECT 1 FROM migrations WHERE version=4'));
});

test('visitors can join the waitlist once, and their email stays out of the request log',async()=>{
  const visitor=api.client();
  const first=await join(visitor,{email:'  Early@Example.test '});
  assert.equal(first.status,201);
  assert.equal(first.json.ok,true);
  assert.equal((await join(visitor,{email:'early@example.test'})).status,201,'a repeat sign-up still looks successful');
  assert.equal(api.store.get("SELECT count(*) n FROM waitlist WHERE email='early@example.test'").n,1);
  assert.equal(api.store.get("SELECT count(*) n FROM requests WHERE path='/api/waitlist'").n,0);
});

test('waitlist sign-ups are validated and protected',async()=>{
  const visitor=api.client();
  assert.equal((await join(visitor,{email:'not-an-email'})).json.error.code,'INVALID_EMAIL');
  assert.equal((await visitor.post('/api/waitlist',{email:'cross@example.test'},{headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await visitor.post('/api/waitlist',{email:'no-origin@example.test'})).status,403);
  // A filled honeypot field looks accepted but is not stored.
  assert.equal((await join(visitor,{email:'bot@example.test',website:'http://spam.example'})).status,201);
  assert.equal(api.store.get("SELECT count(*) n FROM waitlist WHERE email='bot@example.test'").n,0);
});

test('waitlist sign-ups are rate limited per network',async()=>{
  const visitor=api.client();
  for(let i=0;i<10;i++)assert.equal((await join(visitor,{email:`burst${i}@example.test`})).status,201);
  assert.equal((await join(visitor,{email:'burst-extra@example.test'})).status,429);
});

test('pre-launch mode closes the API and customer workspace but keeps admins working',async()=>{
  const customer=api.client();
  await customer.register('customer@example.test');
  const {key}=await customer.project('Before launch');
  const admin=await adminClient('launch-admin@example.test');

  const toggled=await admin.post('/api/admin/settings',{provider_enabled:true,self_signup_enabled:true,prelaunch_enabled:true,body_days:30,summary_days:90,job_days:30,audit_days:365});
  assert.equal(toggled.status,200);
  assert.equal(toggled.json.settings.prelaunch_enabled,'true');
  assert.ok(api.store.get("SELECT 1 FROM audit WHERE action='prelaunch.enabled'"));
  try{
    const search=await customer.post('/v1/images/search',{query:'mountain',count:'5'},{key});
    assert.equal(search.status,503);
    assert.equal(search.json.error.code,'PRELAUNCH');
    assert.equal((await customer.get('/v1/usage',{key})).status,503);

    assert.equal((await customer.get('/api/projects')).json.error.code,'PRELAUNCH','existing customer sessions are blocked');
    assert.equal((await customer.get('/api/me')).status,200,'the workspace can still tell who is signed in');
    assert.equal((await api.client().login('customer@example.test')).json.error.code,'PRELAUNCH');
    assert.equal((await api.client().register('new-customer@example.test')).json.error.code,'PRELAUNCH');

    assert.equal((await admin.get('/api/projects')).status,200);
    const overview=await admin.get('/api/overview');
    assert.equal(overview.json.prelaunch_enabled,true);
    assert.equal(typeof overview.json.waitlist.total,'number');
  }finally{setPrelaunch(false);}
  assert.equal((await customer.get('/v1/usage',{key})).status,200,'everything reopens when the mode is turned off');
});

test('older settings clients that omit prelaunch_enabled leave it unchanged',async()=>{
  const admin=await adminClient('settings-admin@example.test');
  setPrelaunch(true);
  try{
    const saved=await admin.post('/api/admin/settings',{provider_enabled:true,self_signup_enabled:true,body_days:30,summary_days:90,job_days:30,audit_days:365});
    assert.equal(saved.status,200);
    assert.equal(saved.json.settings.prelaunch_enabled,'true');
    assert.equal((await admin.post('/api/admin/settings',{provider_enabled:true,self_signup_enabled:true,prelaunch_enabled:'yes',body_days:30,summary_days:90,job_days:30,audit_days:365})).status,400);
  }finally{setPrelaunch(false);}
});

test('administrators can list and remove waitlist entries; customers cannot',async()=>{
  await join(api.client(),{email:'listed@example.test'});
  const admin=await adminClient('waitlist-admin@example.test');
  const list=await admin.get('/api/admin/waitlist');
  assert.equal(list.status,200);
  assert.ok(list.json.entries.some(entry=>entry.email==='listed@example.test'));
  assert.equal(list.json.total,list.json.entries.length);

  const removed=await admin.post('/api/admin/waitlist/remove',{email:'listed@example.test'});
  assert.equal(removed.status,200);
  assert.equal(api.store.get("SELECT count(*) n FROM waitlist WHERE email='listed@example.test'").n,0);
  assert.ok(api.store.get("SELECT 1 FROM audit WHERE action='waitlist.removed' AND target='listed@example.test'"));
  assert.equal((await admin.post('/api/admin/waitlist/remove',{email:'listed@example.test'})).status,404);

  const customer=api.client();
  await customer.register('curious@example.test');
  assert.equal((await customer.get('/api/admin/waitlist')).status,403);
});

test('waitlist CSV escapes formulas and uses UTC timestamps',()=>{
  const csv=waitlistToCsv([{email:'=cmd@example.test',created:Date.UTC(2026,9,18,12)}]);
  assert.equal(csv,"email,signed_up_at\n'=cmd@example.test,2026-10-18T12:00:00.000Z");
});
