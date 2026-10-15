import {requestBytes,parseImages} from './provider.mjs';
import {bingParameters} from './filters.mjs';
import {LIMITS} from './limits.mjs';

// A provider returns candidate images for one result page: fetchPage(query,page,filters) -> candidates[]
// Candidate shape: {url,width,height,kind,host,title,thumbnail,sourceUrl}

const bing={
  name:'bing',
  async fetchPage(query,page,filters={}) {
    const url=new URL('https://www.bing.com/images/async');
    url.search=new URLSearchParams({q:query,async:'1',first:String(page*LIMITS.imagesPerPage+1),count:String(LIMITS.imagesPerPage),...bingParameters(filters)}).toString();
    const response=await requestBytes(url,{signal:AbortSignal.timeout(8000),maxBytes:4*1024*1024});
    const html=response.buffer.toString('utf8');
    const records=parseImages(html);
    if(!records.length&&/captcha|unusual traffic|verify you are|challenge/i.test(html))throw new Error('Provider verification required');
    return records;
  },
};

// Deterministic offline provider for tests and local smoke runs. It never touches the network.
export function createMockProvider({pages=3,perPage=LIMITS.imagesPerPage,fail=false}={}) {
  return {
    name:'mock',
    async fetchPage(query,page) {
      if(fail)throw new Error('mock provider failure');
      if(page>=pages)return [];
      const slug=query.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'query';
      return Array.from({length:perPage},(_,index)=>{
        const n=page*perPage+index+1,host=`images-${n%7}.example.test`;
        return {url:`https://${host}/${slug}/${n}.jpg`,width:400+(n%12)*100,height:300+(n%9)*100,kind:'original',host,title:`${query} ${n}`,thumbnail:`https://${host}/${slug}/${n}-thumb.jpg`,sourceUrl:`https://pages-${n%7}.example.test/${slug}/${n}`};
      });
    },
  };
}

// Brave Search API (a licensed, keyed alternative to reading Bing's public page).
// Only these parts are confirmed from Brave's documentation: GET /res/v1/images/search, the X-Subscription-Token header,
// count up to 200, safesearch strict|off, and properties.url/width/height on each result. Other field names are read
// defensively. Brave documents no pagination, so one call returns the whole result set and later pages are empty.
// Image type, shape, size and colour filters are not supported by Brave and are ignored. NOT YET TESTED against the live API.
export function createBraveProvider({apiKey,fetchImpl=fetch,timeoutMs=10000}={}) {
  if(!apiKey)throw new Error('BRAVE_API_KEY is required when PLUKO_PROVIDER=brave');
  return {
    name:'brave',
    async fetchPage(query,page) {
      if(page>0)return [];
      const url=new URL('https://api.search.brave.com/res/v1/images/search');
      url.search=new URLSearchParams({q:query,count:'200',safesearch:'strict'}).toString();
      const response=await fetchImpl(url,{headers:{Accept:'application/json','X-Subscription-Token':apiKey},signal:AbortSignal.timeout(timeoutMs)});
      if(!response.ok)throw new Error(`Brave API returned HTTP ${response.status}`);
      const data=await response.json();
      const candidates=[],seen=new Set(),web=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
      for(const item of Array.isArray(data?.results)?data.results:[]){
        const image=web(item?.properties?.url);
        if(!image||seen.has(image))continue;
        seen.add(image);
        const host=new URL(image).hostname;
        candidates.push({url:image,width:Number(item.properties.width)||0,height:Number(item.properties.height)||0,kind:'original',host,title:typeof item.title==='string'&&item.title?item.title:host,thumbnail:web(item?.thumbnail?.src),sourceUrl:web(item?.url)});
      }
      return candidates;
    },
  };
}

export const PROVIDER_NAMES=Object.freeze(['bing','brave','mock']);

export function selectProvider(name=process.env.PLUKO_PROVIDER||'bing',environment=process.env.NODE_ENV) {
  if(name==='bing')return bing;
  if(name==='brave')return createBraveProvider({apiKey:process.env.BRAVE_API_KEY});
  if(name==='mock'){
    if(environment==='production')throw new Error('The mock provider is not available in production');
    return createMockProvider();
  }
  throw new Error(`Unknown PLUKO_PROVIDER "${name}". Use one of: ${PROVIDER_NAMES.join(', ')}`);
}
