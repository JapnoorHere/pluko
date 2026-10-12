import {id,run,now,cleanup} from './db.mjs';
import {tick} from './jobs.mjs';
import {requestBytes,parseImages} from './provider.mjs';
const worker=id('worker');let stopping=false,lastClean=0;
process.on('SIGTERM',()=>stopping=true);process.on('SIGINT',()=>stopping=true);
export async function fetchPage(query,page){const url=new URL('https://www.bing.com/images/async');url.search=new URLSearchParams({q:query,async:'1',first:String(page*35+1),count:'35',adlt:'moderate'}).toString();const response=await requestBytes(url,{signal:AbortSignal.timeout(8000),maxBytes:4*1024*1024});const html=response.buffer.toString('utf8');const records=parseImages(html);if(!records.length&&/captcha|unusual traffic|verify you are|challenge/i.test(html))throw new Error('Provider verification required');return records;}
console.log('Pluko worker started');
while(!stopping){try{run('INSERT INTO workers VALUES(?,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat',worker,now());if(now()-lastClean>3600000){cleanup();lastClean=now();}await tick(worker,fetchPage);}catch(e){console.error('Worker error:',e.message);}if(!stopping)await new Promise(r=>setTimeout(r,1000));}
run('DELETE FROM workers WHERE id=?',worker);
