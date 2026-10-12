import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,ApiError} from '../jobs.mjs';

test('accepts a decimal-string count beyond JavaScript safe integers',()=>{
  const value=normalize({query:'mountain landscape',count:'900719925474099312345'});
  assert.equal(value.queries[0].count,'900719925474099312345');
});
test('normalizes a batch and preserves each requested count',()=>{
  const value=normalize({queries:[{query:' mountain   landscape ',count:'15'},{query:'wireless headphones',count:'30'}],exclude_domains:['Pinterest.com'],min_width:1000});
  assert.deepEqual(value.queries,[{query:'mountain landscape',count:'15'},{query:'wireless headphones',count:'30'}]);
  assert.deepEqual(value.exclude_domains,['pinterest.com']);
});
test('rejects malformed or duplicate batch input',()=>{
  assert.throws(()=>normalize({query:'x',count:'0'}),ApiError);
  assert.throws(()=>normalize({queries:[{query:'Landscape'},{query:'landscape'}]}),ApiError);
  assert.throws(()=>normalize({query:'x',exclude_domains:['https://bad.example']}),ApiError);
});
