import {get,all,run,tx,id,now,setting,audit} from './db.mjs';
import {LIMITS} from './limits.mjs';
export class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export function normalize(input){
  const count=value=>{const s=String(value??15);if(!/^[1-9]\d*$/.test(s)||s.length>1000)throw new ApiError(400,'INVALID_COUNT','count must be a positive integer; use a decimal string for very large values');return BigInt(s).toString();};
  const queries=(input.queries??[{query:input.query,count:input.count}]);
  if(!Array.isArray(queries)||!queries.length)throw new ApiError(400,'INVALID_QUERY','Provide query or a nonempty queries array');
  const normalized=queries.map(x=>{if(typeof x==='string')x={query:x};const q=String(x?.query||'').trim().replace(/\s+/g,' ');if(!q||q.length>200)throw new ApiError(400,'INVALID_QUERY','Each query must contain 1–200 characters');return {query:q,count:count(x.count??input.count)};});
  if(new Set(normalized.map(x=>x.query.toLowerCase())).size!==normalized.length)throw new ApiError(400,'DUPLICATE_QUERY','Combine repeated queries into one count');
  const width=Number(input.min_width??800);if(!Number.isInteger(width)||width<0||width>20000)throw new ApiError(400,'INVALID_FILTER','min_width must be between 0 and 20000');
  const domains=input.exclude_domains??[];if(!Array.isArray(domains)||domains.some(x=>typeof x!=='string'||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(x)))throw new ApiError(400,'INVALID_DOMAIN','Use plain domains without URLs');
  const policy=input.watermark_policy??'prefer_clean';if(!['any','prefer_clean'].includes(policy))throw new ApiError(400,'INVALID_FILTER','watermark_policy must be any or prefer_clean');
  return {queries:normalized,min_width:width,exclude_domains:domains.map(x=>x.toLowerCase()),watermark_policy:policy};
}
export function createJob(auth,input,idem){const payload=normalize(input);if(idem&&(!/^[\w.-]{1,128}$/.test(idem)))throw new ApiError(400,'INVALID_IDEMPOTENCY','Invalid Idempotency-Key');return tx(()=>{
  if(idem){const previous=get('SELECT * FROM jobs WHERE project_id=? AND idempotency=?',auth.project_id,idem);if(previous){if(previous.payload!==JSON.stringify(payload))throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Key already used for a different payload');return {id:previous.id,reused:true};}}
  if(get("SELECT count(*) n FROM jobs WHERE project_id=? AND status IN ('queued','running')",auth.project_id).n>=LIMITS.activeJobsPerProject)throw new ApiError(429,'QUEUE_FULL',`Project has ${LIMITS.activeJobsPerProject} active jobs; wait or cancel one`);
  const job=id('job'),t=now();run('INSERT INTO jobs(id,user_id,project_id,key_id,payload,status,created,updated,idempotency) VALUES(?,?,?,?,?,?,?,?,?)',job,auth.user_id,auth.project_id,auth.key_id||null,JSON.stringify(payload),'queued',t,t,idem||null);
  for(const q of payload.queries)run('INSERT INTO tasks(id,job_id,query,requested,status,updated) VALUES(?,?,?,?,?,?)',id('task'),job,q.query,q.count,'queued',t);
  return {id:job,reused:false};
});}
export function jobView(job){const tasks=all('SELECT id,query,requested,found,page,status,reason FROM tasks WHERE job_id=? ORDER BY rowid',job.id);return {id:job.id,project_id:job.project_id,status:job.status,created:job.created,updated:job.updated,queries:tasks,returned:tasks.reduce((s,x)=>s+x.found,0),requested:tasks.reduce((s,x)=>s+BigInt(x.requested),0n).toString(),filters:JSON.parse(job.payload),expires:['queued','running'].includes(job.status)?null:job.updated+Number(setting('job_days')||30)*86400000};}
export function settle(jobId){const job=get('SELECT * FROM jobs WHERE id=?',jobId);if(!job)return;const tasks=all('SELECT status FROM tasks WHERE job_id=?',jobId);let status='running';if(tasks.every(x=>!['queued','running'].includes(x.status)))status=job.cancel?'cancelled':tasks.every(x=>x.status==='complete')?'complete':'partial';run('UPDATE jobs SET status=?,updated=? WHERE id=?',status,now(),jobId);}
export function cancelJob(job,actor){tx(()=>{run('UPDATE jobs SET cancel=1,status=?,updated=? WHERE id=?','cancelled',now(),job.id);run("UPDATE tasks SET status='cancelled',reason='user_cancelled',lease_owner=NULL,lease_until=0 WHERE job_id=? AND status IN ('queued','running')",job.id);audit(actor,'job.cancel',job.id);});}
export function claim(owner){return tx(()=>{
  run("UPDATE tasks SET status='queued',lease_owner=NULL,lease_until=0 WHERE status='running' AND lease_until<?",now());
  const task=get(`SELECT t.*,j.project_id,j.user_id,j.key_id,j.payload FROM tasks t JOIN jobs j ON j.id=t.job_id JOIN users u ON u.id=j.user_id WHERE t.status='queued' AND t.next_at<=? AND j.cancel=0 AND u.active=1 ORDER BY t.updated,t.rowid LIMIT 1`,now());
  if(!task)return null;
  if(task.key_id){const key=get('SELECT * FROM api_keys WHERE id=?',task.key_id);if(!key||key.revoked||(key.expires&&key.expires<now())){run("UPDATE tasks SET status='partial',reason='key_revoked_or_expired' WHERE id=?",task.id);settle(task.job_id);return null;}}
  const day=new Date().toISOString().slice(0,10),quota=get('SELECT daily_pages FROM projects WHERE id=?',task.project_id).daily_pages;
  const used=get('SELECT pages FROM usage WHERE project_id=? AND day=?',task.project_id,day)?.pages||0;
  if(used>=quota){run("UPDATE tasks SET status='partial',reason='daily_page_quota' WHERE id=?",task.id);settle(task.job_id);return null;}
  run('INSERT INTO usage VALUES(?,?,1) ON CONFLICT(project_id,day) DO UPDATE SET pages=pages+1',task.project_id,day);
  run("UPDATE tasks SET status='running',lease_owner=?,lease_until=?,updated=? WHERE id=?",owner,now()+30000,now(),task.id);
  run("UPDATE jobs SET status='running',updated=? WHERE id=?",now(),task.job_id);return task;
});}
export async function tick(owner,fetchPage){if(setting('provider_enabled')!=='true')return false;const task=claim(owner);if(!task)return false;const start=now();let candidates=[],error=null;
  try{candidates=await fetchPage(task.query,task.page);}catch(e){error=String(e.message).slice(0,500);}
  tx(()=>{
    const current=get('SELECT * FROM tasks WHERE id=?',task.id);if(!current||current.lease_owner!==owner||current.status!=='running')return;
    const job=get('SELECT * FROM jobs WHERE id=?',task.job_id),options=JSON.parse(job.payload);let accepted=0,status='queued',reason=null;
    if(error){status=task.attempts>=2?'partial':'queued';reason=status==='partial'?'provider_failed':null;}
    else{
      const rules=all('SELECT * FROM rules'),blocked=[...options.exclude_domains,...rules.filter(x=>x.action==='block').map(x=>x.domain)];
      const matches=(host,domain)=>host===domain||host.endsWith('.'+domain);
      const candidatesSorted=candidates.map((x,index)=>({...x,index,penalty:rules.filter(r=>r.action==='downrank'&&matches(x.host,r.domain)).length+(options.watermark_policy==='prefer_clean'&&/watermark|stock photo|shutterstock|alamy|dreamstime|depositphotos/i.test(x.title+' '+x.host)?5:0)})).sort((a,b)=>a.penalty-b.penalty||a.index-b.index);
      for(const c of candidatesSorted){if(BigInt(task.found+accepted)>=BigInt(task.requested))break;if(c.width<options.min_width||blocked.some(d=>matches(c.host,d)))continue;
        const data={id:id('img'),query:task.query,title:c.title,image_url:c.url,thumbnail_url:c.thumbnail,source_url:c.sourceUrl,source_domain:c.host,width:c.width,height:c.height,dimensions_verified:false,watermark_status:'unknown',watermark_hint:c.penalty?'source_or_title_signal':'not_assessed',license_status:'unknown',provider:'bing'};
        accepted+=Number(run('INSERT OR IGNORE INTO results(id,job_id,task_id,url,data) VALUES(?,?,?,?,?)',data.id,task.job_id,task.id,c.url,JSON.stringify(data)).changes);
      }
      if(BigInt(task.found+accepted)>=BigInt(task.requested)){status='complete';reason='requested_count_reached';}
      else if(!candidates.length||(!accepted&&task.empty_pages>=2)){status='partial';reason='source_exhausted_or_no_new_matches';}
    }
    run('INSERT INTO attempts(job_id,task_id,provider,page,status,duration,candidates,accepted,error,created) VALUES(?,?,?,?,?,?,?,?,?,?)',task.job_id,task.id,'bing',task.page,error?'error':'ok',now()-start,candidates.length,accepted,error,now());
    run('UPDATE tasks SET found=found+?,page=page+?,empty_pages=?,attempts=?,status=?,reason=?,lease_owner=NULL,lease_until=0,next_at=?,updated=? WHERE id=?',accepted,error?0:1,accepted?0:task.empty_pages+1,error?task.attempts+1:0,status,reason,now()+(error?Math.min(30000,2000*2**task.attempts):1000),now(),task.id);
    settle(task.job_id);
  });return true;
}
