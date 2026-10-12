import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns/promises';
import net from 'node:net';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
export function publicIP(ip) {
  if (net.isIP(ip) === 4) {
    const [a,b] = ip.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19)));
  }
  // Only global unicast IPv6; mapped/transition addresses are not accepted.
  return net.isIP(ip)===6 && /^[23]/i.test(ip) && !/^2001:(?:0:|db8:)/i.test(ip) && !/^2002:/i.test(ip);
}
export async function requestBytes(input, {signal, maxBytes=12*1024*1024, redirects=4}={}) {
  const url=new URL(input);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw new Error('Unsupported remote URL');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  signal?.throwIfAborted();
  const records=await Promise.race([dns.lookup(host,{all:true}),new Promise((_,reject)=>{
    if (signal?.aborted) reject(signal.reason);
    else signal?.addEventListener('abort',()=>reject(signal.reason),{once:true});
  })]);
  if (!records.length || records.some(r=>!publicIP(r.address))) throw new Error('Private or reserved network destination rejected');
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const req=(url.protocol==='https:'?https:http).get(url,{
      signal, headers:{'User-Agent':USER_AGENT,'Accept':'*/*','Accept-Encoding':'identity'},
      lookup:(_host,options,callback)=> options.all ? callback(null,records) : callback(null,records[0].address,records[0].family)
    },res=>{
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (!redirects) return reject(new Error('Too many redirects'));
        requestBytes(new URL(res.headers.location,url).href,{signal,maxBytes,redirects:redirects-1}).then(resolve,reject); return;
      }
      if (res.statusCode!==200) {res.resume();reject(new Error(`Remote server returned HTTP ${res.statusCode}`));return;}
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes) res.destroy(new Error('Response exceeds size limit'));else chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>resolve({buffer:Buffer.concat(chunks),type:String(res.headers['content-type']||''),url:url.href}));
    });req.on('error',reject);
  });
}
export function decode(value) {
  return value.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
export function parseImages(html) {
  const found=new Map();
  for(const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag=match[0],meta=tag.match(/\bm="([^"]+)"/i);
    if(!meta)continue;
    try {
      const item=JSON.parse(decode(meta[1]));
      const url=new URL(item.murl);if(!['https:','http:'].includes(url.protocol)||found.has(url.href))continue;
      const href=tag.match(/\bhref="([^"]+)"/i);
      const detail=new URL(decode(href?.[1]||''),'https://www.bing.com');
      const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
      found.set(url.href,{url:url.href,width:Number(detail.searchParams.get('expw'))||0,height:Number(detail.searchParams.get('exph'))||0,kind:'original',host:url.hostname,title:item.t||url.hostname,thumbnail:safeURL(item.turl),sourceUrl:safeURL(item.purl)});
    }catch{}
  }
  return [...found.values()];
}

