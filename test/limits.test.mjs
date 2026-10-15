import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMITS,dayKey,nextReset,summarizeUsage} from '../limits.mjs';
import {csvCell,resultsToCsv,expiryText,daysLeft,usageShare,reasonText} from '../lib/display.js';

const noon=Date.UTC(2026,9,14,12,0,0);

test('limits are frozen and match the documented defaults',()=>{
  assert.equal(Object.isFrozen(LIMITS),true);
  assert.equal(LIMITS.keyPerMinute,120);
  assert.equal(LIMITS.accountPerMinute,240);
  assert.equal(LIMITS.imagesPerPage,35);
});

test('usage days roll over at 00:00 UTC',()=>{
  assert.equal(dayKey(noon),'2026-10-14');
  assert.equal(nextReset(noon),Date.UTC(2026,9,15));
  assert.equal(nextReset(Date.UTC(2026,11,31,23,59)),Date.UTC(2027,0,1));
});

test('summarizes today’s page usage against the quota',()=>{
  const rows=[{day:'2026-10-13',pages:80},{day:'2026-10-14',pages:150}];
  const value=summarizeUsage({id:'prj_1',name:'Shop',daily_pages:200},rows,noon);
  assert.equal(value.pages_used,150);
  assert.equal(value.pages_remaining,50);
  assert.equal(value.resets_at,Date.UTC(2026,9,15));
  assert.deepEqual(value.history.map(row=>row.day),['2026-10-14','2026-10-13']);
});

test('usage never reports negative remaining pages and handles a quiet day',()=>{
  const over=summarizeUsage({id:'p',name:'x',daily_pages:10},[{day:'2026-10-14',pages:25}],noon);
  assert.equal(over.pages_remaining,0);
  const quiet=summarizeUsage({id:'p',name:'x',daily_pages:10},[{day:'2026-10-01',pages:9}],noon);
  assert.equal(quiet.pages_used,0);
  assert.equal(quiet.pages_remaining,10);
});

test('CSV export quotes cells and neutralises spreadsheet formulas',()=>{
  assert.equal(csvCell('plain'),'plain');
  assert.equal(csvCell('a,b'),'"a,b"');
  assert.equal(csvCell('say "hi"'),'"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")').startsWith('"\'='),true);
  assert.equal(csvCell('+1'),"'+1");
  assert.equal(csvCell(null),'');
  const csv=resultsToCsv([{query:'cats',title:'A, B',image_url:'https://x.test/a.jpg',width:800}]);
  const [header,row]=csv.split('\n');
  assert.equal(header.startsWith('query,title,image_url'),true);
  assert.equal(row.startsWith('cats,"A, B",https://x.test/a.jpg'),true);
});

test('expiry text and percentages',()=>{
  assert.equal(daysLeft(null),null);
  assert.equal(expiryText(null),'Never');
  assert.equal(expiryText(noon-1000,noon),'Expired');
  assert.equal(expiryText(noon+3600000,noon),'Tomorrow');
  assert.equal(expiryText(noon+10*86400000,noon),'In 10 days');
  assert.equal(usageShare(50,200),25);
  assert.equal(usageShare(500,200),100);
  assert.equal(usageShare(1,0),0);
});

test('job reasons are explained in plain language',()=>{
  assert.match(reasonText('daily_page_quota'),/daily page limit/);
  assert.equal(reasonText(null),'—');
  assert.equal(reasonText('something_new'),'something_new');
});
