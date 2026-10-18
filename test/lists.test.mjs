import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {list,oneOf,equals,choice,range,escapeLike,pageParams} from '../lists.mjs';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE items(id TEXT PRIMARY KEY,owner TEXT,status TEXT,name TEXT,created INTEGER)');
const insert=sqlite.prepare('INSERT INTO items VALUES(?,?,?,?,?)');
for(let i=1;i<=60;i++)insert.run('it_'+i,i%2?'alice':'bob',['open','done','failed'][i%3],`Item ${i}${i===7?' 50%_off':''}`,i*1000);
const db={get:(sql,...p)=>sqlite.prepare(sql).get(...p),all:(sql,...p)=>sqlite.prepare(sql).all(...p)};

const spec=extra=>({select:'*',from:'items',search:['name','id'],sorts:{created_desc:'created DESC',created_asc:'created ASC',name_asc:'name ASC'},defaultSort:'created_desc',
  filters:[oneOf('status','status',['open','done','failed']),equals('owner','owner'),range('created','created'),choice('age',{old:'created<10000',recent:now=>({sql:'created>=?',values:[now>0?10000:Infinity]})})],...extra});
const run=(query,extra)=>list(db,new URL('http://x/?'+query),spec(extra));
const code=fn=>{try{fn();}catch(error){return error.code;}return null;};

test('pages default to 25 newest-first and report the total',()=>{
  const first=run('');
  assert.equal(first.items.length,25);assert.equal(first.total,60);assert.equal(first.has_more,true);
  assert.equal(first.items[0].id,'it_60');assert.equal(first.sort,'created_desc');
  const last=run('page=3');
  assert.equal(last.items.length,10);assert.equal(last.has_more,false);
  assert.equal(run('page=9').items.length,0,'a page past the end is empty, not an error');
});

test('page and page_size are validated',()=>{
  assert.equal(run('page_size=10').items.length,10);
  assert.equal(code(()=>run('page_size=7')),'INVALID_PAGE_SIZE');
  assert.equal(code(()=>run('page=0')),'INVALID_PAGE');
  assert.equal(code(()=>run('page=1.5')),'INVALID_PAGE');
  assert.deepEqual(pageParams(new URL('http://x/')),{page:1,page_size:25});
});

test('multi-value filters accept repeated and comma-separated values and reject unknown ones',()=>{
  assert.equal(run('status=open').total,20);
  assert.equal(run('status=open,done').total,40);
  assert.equal(run('status=open&status=failed').total,40);
  assert.equal(code(()=>run('status=deleted')),'INVALID_FILTER');
  assert.equal(run('owner=alice&status=done').total,10);
});

test('named choices can use the current time and are ORed together',()=>{
  assert.equal(run('age=old').total,9);
  assert.equal(run('age=old,recent').total,60);
  assert.equal(code(()=>run('age=ancient')),'INVALID_FILTER');
});

test('date ranges accept epoch ms or ISO dates and must be in order',()=>{
  assert.equal(run('created_from=10000&created_to=19000').total,10);
  assert.equal(run('created_to=1970-01-01T00:00:05Z').total,5);
  assert.equal(code(()=>run('created_from=20&created_to=10')),'INVALID_FILTER');
  assert.equal(code(()=>run('created_from=yesterday')),'INVALID_FILTER');
});

test('search matches LIKE wildcards literally',()=>{
  assert.equal(escapeLike('50%_off'),'50\\%\\_off');
  assert.equal(run('q='+encodeURIComponent('50%_off')).total,1);
  assert.equal(run('q=%25').total,1,'a bare % is not a wildcard');
  assert.equal(run('q=it_1').total,11);
  assert.equal(code(()=>run('q='+'x'.repeat(101))),'INVALID_SEARCH');
});

test('sorts come only from the allowed list',()=>{
  assert.equal(run('sort=created_asc').items[0].id,'it_1');
  assert.equal(code(()=>run('sort=name;DROP TABLE items')),'INVALID_SORT');
});

test('fixed scope clauses always apply',()=>{
  const scoped=run('owner=bob',{where:['owner=?'],params:['alice']});
  assert.equal(scoped.total,0,'a filter can narrow the scope but never widen it');
});
