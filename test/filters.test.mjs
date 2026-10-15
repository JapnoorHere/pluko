import test from 'node:test';
import assert from 'node:assert/strict';
import {FILTER_VALUES,parseFilters,bingParameters} from '../filters.mjs';
import {selectProvider,createMockProvider,createBraveProvider,PROVIDER_NAMES} from '../providers.mjs';

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
  assert.deepEqual([...PROVIDER_NAMES],['bing','brave','mock']);
  assert.equal(selectProvider('bing','production').name,'bing');
  assert.equal(selectProvider('mock','test').name,'mock');
  assert.throws(()=>selectProvider('mock','production'),/not available in production/);
  assert.throws(()=>selectProvider('nonsense','test'),/Unknown PLUKO_PROVIDER/);
});

// These tests check our handling of a response shaped like Brave's documented fields. They do not prove the live API matches.
test('the Brave provider needs a key, sends it as a header, and maps results',async()=>{
  assert.throws(()=>createBraveProvider({}),/BRAVE_API_KEY/);
  const saved=process.env.BRAVE_API_KEY;delete process.env.BRAVE_API_KEY;
  try{assert.throws(()=>selectProvider('brave','test'),/BRAVE_API_KEY/);}finally{if(saved)process.env.BRAVE_API_KEY=saved;}

  const calls=[];
  const body={results:[
    {title:'Skyline',url:'https://page.example.com/a',thumbnail:{src:'https://imgs.example.com/t1.jpg'},properties:{url:'https://cdn.example.com/1.jpg',width:1600,height:900}},
    {title:'Duplicate',url:'https://page.example.com/b',properties:{url:'https://cdn.example.com/1.jpg',width:1600,height:900}},
    {url:'https://page.example.com/c',properties:{url:'https://cdn.example.com/2.png'}},
    {title:'No image',url:'https://page.example.com/d',properties:{}},
    {title:'Bad scheme',properties:{url:'javascript:alert(1)'}},
    null,
  ]};
  const provider=createBraveProvider({apiKey:'test-key',fetchImpl:async(url,options)=>{calls.push({url:String(url),options});return {ok:true,status:200,json:async()=>body};}});
  const items=await provider.fetchPage('city skyline',0,{image_type:'photo',safe_search:'moderate'});
  assert.equal(provider.name,'brave');
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.headers['X-Subscription-Token'],'test-key');
  const sent=new URL(calls[0].url);
  assert.equal(sent.origin+sent.pathname,'https://api.search.brave.com/res/v1/images/search');
  assert.equal(sent.searchParams.get('q'),'city skyline');
  assert.equal(sent.searchParams.get('count'),'200');
  assert.equal(sent.searchParams.get('safesearch'),'strict','never less strict than the requested level');
  assert.equal(items.length,2,'duplicates and unusable results are dropped');
  assert.deepEqual(items[0],{url:'https://cdn.example.com/1.jpg',width:1600,height:900,kind:'original',host:'cdn.example.com',title:'Skyline',thumbnail:'https://imgs.example.com/t1.jpg',sourceUrl:'https://page.example.com/a'});
  assert.equal(items[1].title,'cdn.example.com');
  assert.equal(items[1].width,0);
  assert.equal(items[1].thumbnail,null);
  assert.deepEqual(await provider.fetchPage('city skyline',1),[],'no second page');
  assert.equal(calls.length,1);
});

test('the Brave provider reports API failures and tolerates empty bodies',async()=>{
  const failing=createBraveProvider({apiKey:'k',fetchImpl:async()=>({ok:false,status:429,json:async()=>({})})});
  await assert.rejects(failing.fetchPage('x',0),/HTTP 429/);
  const empty=createBraveProvider({apiKey:'k',fetchImpl:async()=>({ok:true,status:200,json:async()=>({})})});
  assert.deepEqual(await empty.fetchPage('x',0),[]);
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
