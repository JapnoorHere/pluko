import test from 'node:test';
import assert from 'node:assert/strict';
import {timeAgo,formatDuration,percent,parseRoute,routePath,passwordStrength,initials,statusTone,httpTone,matches,dailySeries,settingsPayload} from '../lib/ui-helpers.js';

const NOW=Date.UTC(2026,9,16,12,0,0);

test('relative times read naturally in both directions',()=>{
  assert.equal(timeAgo(NOW-20000,NOW),'just now');
  assert.equal(timeAgo(NOW-5*60000,NOW),'5 minutes ago');
  assert.equal(timeAgo(NOW-86400000,NOW),'yesterday');
  assert.equal(timeAgo(NOW+3*86400000,NOW),'in 3 days');
  assert.equal(timeAgo(null,NOW),'—');
});

test('durations and percentages are bounded and readable',()=>{
  assert.equal(formatDuration(45),'45 ms');
  assert.equal(formatDuration(2500),'2.5 s');
  assert.equal(formatDuration(null),'—');
  assert.equal(percent(5,10),50);
  assert.equal(percent(20,10),100);
  assert.equal(percent(1,0),0);
});

test('routes map URLs to views and refuse unknown or admin-only views',()=>{
  assert.deepEqual(parseRoute('/app/jobs/job_1'),{base:'/app',view:'jobs',id:'job_1',tab:null});
  assert.deepEqual(parseRoute('/app/projects/p1/webhook'),{base:'/app',view:'projects',id:'p1',tab:'webhook'});
  assert.deepEqual(parseRoute('/app/projects/p1/nope'),{base:'/app',view:'projects',id:'p1',tab:'overview'});
  assert.equal(parseRoute('/app/account').tab,'profile');
  assert.equal(parseRoute('/app/account/sessions').tab,'sessions');
  assert.equal(parseRoute('/app/users').view,'overview');
  assert.equal(parseRoute('/admin/users','admin').view,'users');
  assert.equal(parseRoute('/app/keys/extra').id,null);
  assert.equal(parseRoute('/app').view,'overview');
  assert.equal(routePath('/app','projects','a b','keys'),'/app/projects/a%20b/keys');
  assert.equal(routePath('/admin','overview'),'/admin/overview');
});

test('password strength never calls a short password strong',()=>{
  assert.equal(passwordStrength('').score,0);
  assert.equal(passwordStrength('Ab1!Ab1!').met,false);
  assert.equal(passwordStrength('Ab1!Ab1!').label,'Too short');
  assert.ok(passwordStrength('correct horse battery staple').met);
  assert.equal(passwordStrength('Correct-Horse-9-Battery').score,4);
});

test('daily usage is summed across projects and zero-filled, oldest day first',()=>{
  const series=dailySeries([{day:'2026-10-16',pages:3},{day:'2026-10-16',pages:2},{day:'2026-10-14',pages:7},{day:'2026-09-01',pages:99}],7,NOW);
  assert.equal(series.length,7);
  assert.equal(series[0].day,'2026-10-10');
  assert.equal(series.at(-1).day,'2026-10-16');
  assert.equal(series.at(-1).value,5);
  assert.equal(series.at(-3).value,7);
  assert.equal(series.reduce((sum,item)=>sum+item.value,0),12);
});

test('initials, tones and search matching',()=>{
  assert.equal(initials('jane.doe@example.com'),'JD');
  assert.equal(initials('x@example.com'),'X');
  assert.equal(statusTone('complete'),'success');
  assert.equal(statusTone('Mystery'),'neutral');
  assert.equal(httpTone(503),'danger');
  assert.equal(httpTone(404),'warning');
  assert.equal(httpTone(200),'success');
  assert.ok(matches({name:'Alpha'},'alp',['name']));
  assert.ok(!matches({name:'Alpha'},'beta',['name']));
  assert.ok(matches({name:'Alpha'},'',['name']));
});

test('settings changes are merged onto the stored string settings',()=>{
  const stored={provider_enabled:'true',self_signup_enabled:'false',body_days:'7',summary_days:'30',job_days:'30',audit_days:'365'};
  assert.deepEqual(settingsPayload(stored,{provider_enabled:false}),{provider_enabled:false,self_signup_enabled:false,body_days:7,summary_days:30,job_days:30,audit_days:365});
  assert.equal(settingsPayload(stored,{job_days:'60'}).job_days,60);
  assert.equal(settingsPayload(stored).provider_enabled,true);
});
