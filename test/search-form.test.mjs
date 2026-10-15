import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQueries,parseDomains,estimatePages} from '../lib/search-form.js';

test('queries are trimmed, de-duplicated without regard to case, and blank lines are dropped',()=>{
  assert.deepEqual(parseQueries('  Red   car \n\nblue boat\nRED CAR\n   \nGreen tree'),['Red car','blue boat','Green tree']);
  assert.deepEqual(parseQueries(''),[]);
  assert.deepEqual(parseQueries('\n\n'),[]);
});

test('domains accept commas, spaces and new lines',()=>{
  assert.deepEqual(parseDomains('Example.com, other.org\nthird.net  example.com'),['example.com','other.org','third.net']);
  assert.deepEqual(parseDomains(''),[]);
});

test('the page estimate uses 35 images per page and rejects invalid counts',()=>{
  assert.equal(estimatePages('15',1),1);
  assert.equal(estimatePages('35',1),1);
  assert.equal(estimatePages('36',1),2);
  assert.equal(estimatePages('100',3),9);
  for(const bad of ['','0','-5','1.5','abc','1e3',' 7','9'.repeat(16)])assert.equal(estimatePages(bad,1),null,JSON.stringify(bad));
});
