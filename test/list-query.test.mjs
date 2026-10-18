import test from 'node:test';
import assert from 'node:assert/strict';
import {readState,writeState,apiParams,dateRange,describeDateRange,pageWindow,rangeLabel,nextSort,activeFilterCount,emptyState} from '../lib/list-query.js';

const defs=[
  {id:'status',type:'multi',options:[['open','Open'],['done','Done']]},
  {id:'project_id',type:'select'},
  {id:'created',type:'date'},
];
const defaults={sort:'created_desc'};

test('state round-trips through the URL and omits defaults',()=>{
  const state={...emptyState(defaults),q:'cats',page:3,pageSize:50,filters:{status:['open','done'],project_id:'prj_1',created:'7d'}};
  const search=writeState('?tab=keys',state,defs,defaults);
  assert.equal(search,'?tab=keys&q=cats&page=3&page_size=50&status=open%2Cdone&project_id=prj_1&created=7d');
  assert.deepEqual(readState(search,defs,defaults),state);
  assert.equal(writeState('',emptyState(defaults),defs,defaults),'');
});

test('bad URL values are ignored instead of breaking the page',()=>{
  const state=readState('?status=open,deleted&page=-2&page_size=7&created=yesterday',defs,defaults);
  assert.deepEqual(state.filters.status,['open']);
  assert.equal(state.page,1);assert.equal(state.pageSize,25);assert.equal(state.filters.created,'');
});

test('prefixes keep two lists on one page apart',()=>{
  const search=writeState('',{...emptyState(),page:2},defs,{},'jobs.');
  assert.equal(search,'?jobs.page=2');
  assert.equal(readState(search,defs,{},'logs.').page,1);
});

test('API parameters expand date filters to epoch milliseconds',()=>{
  const now=Date.UTC(2026,9,18);
  const state={...emptyState(defaults),filters:{status:['open'],created:'24h'}};
  const params=apiParams(state,defs,{user_id:'usr_1'},now);
  assert.equal(params.get('created_from'),String(now-86400000));
  assert.equal(params.get('created_to'),null);
  assert.equal(params.get('status'),'open');
  assert.equal(params.get('user_id'),'usr_1');
  assert.equal(params.get('page_size'),'25');
});

test('custom date ranges cover whole local days',()=>{
  const range=dateRange('2026-10-01..2026-10-02');
  assert.equal(range.to-range.from,2*86400000-1);
  assert.equal(dateRange('..2026-10-02').from,null);
  assert.equal(dateRange('..'),null);
  assert.equal(describeDateRange('7d'),'Last 7 days');
  assert.match(describeDateRange('2026-10-01..'),/^Since /);
});

test('page windows show the ends, the neighbourhood and gaps',()=>{
  assert.deepEqual(pageWindow(1,5),[1,2,3,4,5]);
  assert.deepEqual(pageWindow(1,20),[1,2,3,4,'…',20]);
  assert.deepEqual(pageWindow(10,20),[1,'…',9,10,11,'…',20]);
  assert.deepEqual(pageWindow(20,20),[1,'…',17,18,19,20]);
});

test('labels, sorting and filter counts',()=>{
  assert.equal(rangeLabel(2,25,1284),'26–50 of 1,284');
  assert.equal(rangeLabel(1,25,0),'0 results');
  assert.equal(nextSort('created_desc','created'),'created_asc');
  assert.equal(nextSort('created_desc','name','asc'),'name_asc');
  assert.equal(activeFilterCount({filters:{status:[],project_id:'x',created:''}},defs),1);
});
