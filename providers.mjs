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

export const PROVIDER_NAMES=Object.freeze(['bing','mock']);

export function selectProvider(name=process.env.PLUKO_PROVIDER||'bing',environment=process.env.NODE_ENV) {
  if(name==='bing')return bing;
  if(name==='mock'){
    if(environment==='production')throw new Error('The mock provider is not available in production');
    return createMockProvider();
  }
  throw new Error(`Unknown PLUKO_PROVIDER "${name}". Use one of: ${PROVIDER_NAMES.join(', ')}`);
}
