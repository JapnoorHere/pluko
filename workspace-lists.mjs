// Filtered, paginated lists for the workspace (/api/*). Each function takes the signed-in session and the request URL.
// Customers always see only their own rows: the scope clause is added here, not taken from the request.
// The public /v1 API keeps its own cursor-based responses and does not use this module.
import {get,all} from './db.mjs';
import {list,oneOf,equals,choice,range,pageInfo} from './lists.mjs';
import {ApiError,jobView} from './jobs.mjs';
import {dayKey} from './limits.mjs';

const db={get,all};
const DAY=86400000;
export const JOB_STATUSES=['queued','running','complete','partial','cancelled'];

const isAdmin=auth=>auth.role==='admin';

/** The rows a session may see. Admin-only filters are refused for everyone else rather than silently ignored. */
function scope(auth,url,ownerColumn,adminFilters=['user_id']){
  if(isAdmin(auth))return {where:[],params:[]};
  for(const name of adminFilters)if(url.searchParams.has(name))throw new ApiError(403,'ADMIN_REQUIRED',`The ${name} filter is only for administrators`);
  return {where:[`${ownerColumn}=?`],params:[auth.user_id]};
}

// Status filter for request logs: a class ("4xx") or an exact code ("404"), several allowed.
const httpStatus=(name,column)=>({params:[name],apply(url){
  const values=url.searchParams.getAll(name).flatMap(v=>v.split(',')).map(v=>v.trim()).filter(Boolean);
  if(!values.length)return null;
  const parts=[],params=[];
  for(const v of values){
    const cls=/^([1-5])xx$/.exec(v);
    if(cls){parts.push(`(${column}>=? AND ${column}<?)`);params.push(Number(cls[1])*100,Number(cls[1])*100+100);}
    else if(/^[1-5]\d\d$/.test(v)){parts.push(`${column}=?`);params.push(Number(v));}
    else throw new ApiError(400,'INVALID_FILTER',`${name} must be a status class like 4xx or a code like 404`);
  }
  return {sql:'('+parts.join(' OR ')+')',values:params};
}});

export function listJobs(auth,url){
  const admin=isAdmin(auth);
  const result=list(db,url,{
    select:'j.*,(SELECT name FROM projects WHERE id=j.project_id) project_name'+(admin?',(SELECT email FROM users WHERE id=j.user_id) user_email':''),
    from:'jobs j',...scope(auth,url,'j.user_id'),
    filters:[oneOf('status','j.status',JOB_STATUSES),equals('project_id','j.project_id'),equals('key_id','j.key_id'),equals('user_id','j.user_id'),range('created','j.created')],
    search:['j.id',pattern=>({sql:"EXISTS (SELECT 1 FROM tasks t WHERE t.job_id=j.id AND t.query LIKE ? ESCAPE '\\')",values:[pattern]})],
    sorts:{
      created_desc:'j.created DESC,j.rowid DESC',created_asc:'j.created ASC,j.rowid ASC',
      found_desc:'(SELECT coalesce(sum(found),0) FROM tasks WHERE job_id=j.id) DESC,j.created DESC',
      duration_desc:'(j.updated-j.created) DESC,j.created DESC',
    },
    defaultSort:'created_desc',
  });
  return {jobs:result.items.map(job=>({...jobView(job),project_name:job.project_name,...(admin?{user_id:job.user_id,user_email:job.user_email}:{})})),...pageInfo(result)};
}

export const LOG_ENDPOINTS={
  search:"r.path IN ('/v1/images/search','/api/search')",
  jobs:"(r.path LIKE '/v1/jobs%' OR r.path LIKE '/api/jobs%') AND r.path NOT LIKE '%/results'",
  results:"r.path LIKE '%/results'",
  usage:"r.path IN ('/v1/usage','/api/usage')",
  feedback:"r.path IN ('/v1/feedback','/api/feedback')",
};

export function listLogs(auth,url){
  const admin=isAdmin(auth),base=scope(auth,url,'r.user_id');
  const source=url.searchParams.get('source')||'api';
  if(!['api','all'].includes(source))throw new ApiError(400,'INVALID_FILTER','source must be api or all');
  if(source==='api')base.where.push("r.path LIKE '/v1/%'");
  const result=list(db,url,{
    select:'r.id,r.user_id,r.project_id,r.key_id,r.method,r.path,r.status,r.duration,r.created,(SELECT name FROM projects WHERE id=r.project_id) project_name'+(admin?',(SELECT email FROM users WHERE id=r.user_id) user_email':''),
    from:'requests r',...base,
    filters:[httpStatus('status','r.status'),oneOf('method','r.method',['GET','POST']),choice('endpoint',LOG_ENDPOINTS),
      equals('project_id','r.project_id'),equals('key_id','r.key_id'),equals('user_id','r.user_id'),range('created','r.created'),
      choice('speed',{slow:'r.duration>=1000',very_slow:'r.duration>=5000'})],
    search:['r.id','r.path','r.payload'],
    sorts:{created_desc:'r.created DESC,r.rowid DESC',created_asc:'r.created ASC,r.rowid ASC',duration_desc:'r.duration DESC,r.created DESC'},
    defaultSort:'created_desc',
  });
  return {logs:result.items,...pageInfo(result)};
}

export function listKeys(auth,url){
  const admin=isAdmin(auth);
  const result=list(db,url,{
    select:'k.id,k.name,k.project_id,p.name project,k.prefix,k.scopes,k.expires,k.revoked,k.last_used,k.created'+(admin?',p.user_id,(SELECT email FROM users WHERE id=p.user_id) owner':''),
    from:'api_keys k JOIN projects p ON p.id=k.project_id',...scope(auth,url,'p.user_id'),
    filters:[
      equals('project_id','k.project_id'),equals('user_id','p.user_id'),range('created','k.created'),
      choice('status',{
        active:now=>({sql:'k.revoked=0 AND (k.expires IS NULL OR k.expires>?)',values:[now]}),
        expiring:now=>({sql:'k.revoked=0 AND k.expires>? AND k.expires<=?',values:[now,now+7*DAY]}),
        expired:now=>({sql:'k.revoked=0 AND k.expires<=?',values:[now]}),
        revoked:'k.revoked=1',
      }),
      choice('scope',{search:`k.scopes LIKE '%"search"%'`,read:`k.scopes LIKE '%"read"%'`}),
      choice('used',{
        never:'k.last_used IS NULL',
        day:now=>({sql:'k.last_used>=?',values:[now-DAY]}),
        week:now=>({sql:'k.last_used>=?',values:[now-7*DAY]}),
        inactive:now=>({sql:'(k.last_used IS NULL OR k.last_used<?)',values:[now-30*DAY]}),
      }),
    ],
    search:['k.name','k.prefix','k.id'],
    sorts:{
      created_desc:'k.created DESC',created_asc:'k.created ASC',name_asc:'k.name COLLATE NOCASE ASC',name_desc:'k.name COLLATE NOCASE DESC',
      last_used_desc:'k.last_used IS NULL,k.last_used DESC',last_used_asc:'k.last_used IS NULL,k.last_used ASC',
      expires_asc:'k.expires IS NULL,k.expires ASC',expires_desc:'k.expires IS NULL,k.expires DESC',
    },
    defaultSort:'created_desc',
  });
  return {keys:result.items,...pageInfo(result)};
}

export function listProjects(auth,url){
  const admin=isAdmin(auth);
  // Today's usage joins on a UTC day string the server builds itself (YYYY-MM-DD), never on request input.
  const today=dayKey(Date.now());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw new Error('Unexpected day key');
  const used='coalesce(d.pages,0)';
  const result=list(db,url,{
    select:`p.id,p.user_id,p.name,p.daily_pages,p.created,p.webhook_url,u.email owner,${used} pages_today,(SELECT count(*) FROM api_keys k WHERE k.project_id=p.id AND k.revoked=0) active_keys`,
    from:`projects p JOIN users u ON u.id=p.user_id LEFT JOIN usage d ON d.project_id=p.id AND d.day='${today}'`,...scope(auth,url,'p.user_id'),
    filters:[
      equals('user_id','p.user_id'),range('created','p.created'),
      choice('usage',{under:`${used}<p.daily_pages*0.8`,near:`${used}>=p.daily_pages*0.8 AND ${used}<p.daily_pages`,at:`${used}>=p.daily_pages`}),
      choice('webhook',{yes:'p.webhook_url IS NOT NULL',no:'p.webhook_url IS NULL'}),
    ],
    search:['p.name','p.id',...(admin?['u.email']:[])],
    sorts:{created_desc:'p.created DESC',created_asc:'p.created ASC',name_asc:'p.name COLLATE NOCASE ASC',name_desc:'p.name COLLATE NOCASE DESC',usage_desc:`${used} DESC,p.created DESC`,usage_asc:`${used} ASC,p.created DESC`},
    defaultSort:'created_desc',
  });
  return {projects:result.items,...pageInfo(result)};
}
