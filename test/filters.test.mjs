import test from 'node:test';
import assert from 'node:assert/strict';
import {FILTER_VALUES,parseFilters,bingParameters} from '../filters.mjs';
import {selectProvider,createMockProvider,PROVIDER_NAMES} from '../providers.mjs';

const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};

test('filters that match the defaults are omitted so existing payloads stay identical',()=>{
  assert.deepEqual(parseFilters({},fail),{});
  assert.deepEqual(parseFilters({safe_search:'moderate',image_type:'any',layout:'any',size:'any',color:'any'},fail),{});
  assert.deepEqual(parseFilters({safe_search:null,image_type:undefined},fail),{});
});

test('valid filters are kept',()=>{
  assert.deepEqual(parseFilters({safe_search:'strict',image_type:'photo',layout:'wide',size:'large',color:'blue'},fail),{safe_search:'strict',image_type:'photo',layout:'wide',size:'large',color:'blue'});
  for(const [name,values] of Object.entries(FILTER_VALUES))for(const value of values)assert.doesNotThrow(()=>parseFilters({[name]:value},fail));
});

test('unknown filter values are rejected with a stable code',()=>{
  for(const input of [{safe_search:'off'},{safe_search:'none'},{image_type:'video'},{layout:'diagonal'},{size:'huge'},{color:'ultraviolet'},{color:7},{layout:['wide']}]){
    assert.throws(()=>parseFilters(input,fail),error=>error.code==='INVALID_FILTER',JSON.stringify(input));
  }
});

test('Bing parameters always carry a safe-search level and only add filters that were chosen',()=>{
  assert.deepEqual(bingParameters({}),{adlt:'moderate'});
  assert.deepEqual(bingParameters({safe_search:'strict'}),{adlt:'strict'});
  assert.deepEqual(bingParameters({image_type:'photo',layout:'square',size:'large',color:'red'}),{adlt:'moderate',qft:'+filterui:photo-photo+filterui:aspect-square+filterui:imagesize-large+filterui:color2-FGcls_RED'});
  assert.equal(bingParameters({color:'black_white'}).qft,'+filterui:color2-bw');
  assert.equal(bingParameters({color:'color'}).qft,'+filterui:color2-color');
  assert.equal(bingParameters({image_type:'line_drawing'}).qft,'+filterui:photo-linedrawing');
  assert.equal(bingParameters({image_type:'any',layout:'any',size:'any',color:'any'}).qft,undefined);
});

test('providers are chosen by name and the mock never runs in production',()=>{
  assert.deepEqual([...PROVIDER_NAMES],['bing','mock']);
  assert.equal(selectProvider('bing','production').name,'bing');
  assert.equal(selectProvider('mock','test').name,'mock');
  assert.throws(()=>selectProvider('mock','production'),/not available in production/);
  assert.throws(()=>selectProvider('nonsense','test'),/Unknown PLUKO_PROVIDER/);
});

test('the mock provider is deterministic and runs out of pages',async()=>{
  const provider=createMockProvider({pages:2,perPage:5});
  const first=await provider.fetchPage('Red Car',0),again=await provider.fetchPage('Red Car',0);
  assert.deepEqual(first,again);
  assert.equal(first.length,5);
  assert.match(first[0].url,/^https:\/\/images-\d\.example\.test\/red-car\/1\.jpg$/);
  assert.equal((await provider.fetchPage('Red Car',1))[0].title,'Red Car 6');
  assert.deepEqual(await provider.fetchPage('Red Car',2),[]);
  await assert.rejects(createMockProvider({fail:true}).fetchPage('x',0),/mock provider failure/);
});
