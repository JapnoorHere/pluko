import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {get,all,run,id,now} from './db.mjs';
import {seal,unseal,secret as randomSecret} from './security.mjs';
import {publicIP} from './provider.mjs';

export const WEBHOOK={maxAttempts:5,backoffMs:[30000,120000,600000,3600000,21600000],timeoutMs:8000,toleranceMs:300000};

// A webhook must be a public https address. The destination is checked again for every delivery.
export function validateWebhookUrl(raw) {
  if(typeof raw!=='string'||!raw.trim()||raw.length>2000)return {error:'Enter a webhook URL (max 2000 characters)'};
  let url;
  try{url=new URL(raw.trim());}catch{return {error:'Enter a valid URL'};}
  if(url.protocol!=='https:')return {error:'Webhook URLs must start with https://'};
  if(url.username||url.password)return {error:'Webhook URLs cannot contain a username or password'};
  if(url.port&&url.port!=='443')return {error:'Webhook URLs must use the standard https port (443)'};
  const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(net.isIP(host))return {error:'Use a domain name, not an IP address'};
  if(!host.includes('.')||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))return {error:'Webhook URLs must use a public domain name'};
  return {url:url.href};
}

export const newWebhookSecret=()=>'whsec_'+randomSecret();

export function signPayload(webhookSecret,timestamp,body) {
  return createHmac('sha256',webhookSecret).update(`${timestamp}.${body}`).digest('hex');
}
export const signatureHeader=(webhookSecret,timestamp,body)=>`t=${timestamp},v1=${signPayload(webhookSecret,timestamp,body)}`;

// Reference verifier, also shown in the docs: rejects bad signatures and replays older than the tolerance.
export function verifySignature(webhookSecret,header,body,{at=now(),toleranceMs=WEBHOOK.toleranceMs}={}) {
  const parts=Object.fromEntries(String(header||'').split(',').map(part=>part.trim().split('=')).filter(pair=>pair.length===2));
  const timestamp=Number(parts.t);
  if(!Number.isFinite(timestamp)||!parts.v1)return false;
  if(Math.abs(at-timestamp)>toleranceMs)return false;
  const expected=Buffer.from(signPayload(webhookSecret,parts.t,body)),given=Buffer.from(parts.v1);
  return expected.length===given.length&&timingSafeEqual(expected,given);
}

export async function postWebhook(urlString,{headers={},body,timeoutMs=WEBHOOK.timeoutMs}) {
  const url=new URL(urlString);
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw new Error('Webhook URL must be https on port 443');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const records=await dns.lookup(host,{all:true});
  if(!records.length||records.some(record=>!publicIP(record.address)))throw new Error('Webhook destination must be a public address');
  return new Promise((resolve,reject)=>{
    const request=https.request(url,{
      method:'POST',timeout:timeoutMs,
      headers:{...headers,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'User-Agent':'Pluko-Webhooks/1'},
      lookup:(_host,options,callback)=>options.all?callback(null,records):callback(null,records[0].address,records[0].family),
    },response=>{response.on('error',reject);response.on('end',()=>resolve(response.statusCode));response.resume();});
    request.on('timeout',()=>request.destroy(new Error('Webhook timed out')));
    request.on('error',reject);
    request.end(body);
  });
}

function insertDelivery(projectId,jobId,event,payload) {
  const delivery=id('whd');
  run('INSERT INTO webhook_deliveries(id,project_id,job_id,event,payload,status,attempts,next_at,created) VALUES(?,?,?,?,?,?,?,?,?)',delivery,projectId,jobId,event,JSON.stringify(payload),'pending',0,now(),now());
  return delivery;
}
const envelope=(type,data)=>({id:id('evt'),type,created:now(),data});

// Queues job.finished for a project that has a webhook. `view` is the object returned by jobView().
export function enqueueJobFinished(view) {
  // Only projects that chose webhook delivery get job.finished events.
  const project=get('SELECT id,webhook_url,delivery FROM projects WHERE id=?',view.project_id);
  if(!project?.webhook_url||project.delivery!=='webhook')return null;
  return insertDelivery(project.id,view.id,'job.finished',envelope('job.finished',{
    job_id:view.id,project_id:view.project_id,status:view.status,requested:view.requested,returned:view.returned,
    queries:view.queries.map(({query,requested,found,status,reason})=>({query,requested,found,status,reason})),
    results_url:`/v1/jobs/${view.id}/results`,
  }));
}

export function enqueueTest(projectId) {
  const project=get('SELECT id,webhook_url FROM projects WHERE id=?',projectId);
  if(!project?.webhook_url)return null;
  return insertDelivery(project.id,'job_test','webhook.test',envelope('webhook.test',{message:'This is a test event from Pluko.',project_id:project.id}));
}

// Delivers due events. `post` can be replaced in tests; the default refuses private network destinations.
export async function deliverDue({limit=5,post=postWebhook,at=now()}={}) {
  const due=all("SELECT * FROM webhook_deliveries WHERE status='pending' AND next_at<=? ORDER BY next_at LIMIT ?",at,limit);
  for(const delivery of due){
    const project=get('SELECT webhook_url,webhook_secret FROM projects WHERE id=?',delivery.project_id);
    if(!project?.webhook_url||!project.webhook_secret){
      run("UPDATE webhook_deliveries SET status='failed',last_error=? WHERE id=?",'Webhook was removed',delivery.id);
      continue;
    }
    let status=null,error=null;
    try{
      const timestamp=Date.now();
      status=await post(project.webhook_url,{body:delivery.payload,headers:{
        'Pluko-Event':delivery.event,'Pluko-Delivery':delivery.id,'Pluko-Signature':signatureHeader(unseal(project.webhook_secret),timestamp,delivery.payload),
      }});
      if(status<200||status>=300)error=`Your server answered HTTP ${status}`;
    }catch(failure){error=String(failure.message).slice(0,300);}
    const attempts=delivery.attempts+1;
    if(!error)run("UPDATE webhook_deliveries SET status='delivered',attempts=?,last_status=?,last_error=NULL,delivered=? WHERE id=?",attempts,status,now(),delivery.id);
    else if(attempts>=WEBHOOK.maxAttempts)run("UPDATE webhook_deliveries SET status='failed',attempts=?,last_status=?,last_error=? WHERE id=?",attempts,status,error,delivery.id);
    else run('UPDATE webhook_deliveries SET attempts=?,last_status=?,last_error=?,next_at=? WHERE id=?',attempts,status,error,at+WEBHOOK.backoffMs[attempts-1],delivery.id);
  }
  return due.length;
}

export const sealSecret=seal;
