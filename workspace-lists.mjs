// Filtered, paginated lists for the workspace (/api/*). Each function takes the signed-in session and the request URL.
// Customers always see only their own rows: the scope clause is added here, not taken from the request.
// The public /v1 API keeps its own cursor-based responses and does not use this module.
import {get,all} from './db.mjs';
import {list,oneOf,equals,choice,range,pageInfo,escapeLike} from './lists.mjs';
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

/* ---------- administrator lists (routes under /api/admin already require an administrator) ---------- */

export function listUsers(url){
  const result=list(db,url,{
    select:'u.id,u.email,u.role,u.active,(u.totp IS NOT NULL) mfa,u.created,u.last_login,(SELECT count(*) FROM projects p WHERE p.user_id=u.id) projects,(SELECT count(*) FROM jobs j WHERE j.user_id=u.id) jobs',
    from:'users u',
    filters:[
      oneOf('role','u.role',['admin','user']),
      choice('status',{active:'u.active=1',suspended:'u.active=0'}),
      choice('mfa',{on:'u.totp IS NOT NULL',off:'u.totp IS NULL'}),
      choice('active_within',{
        day:now=>({sql:'u.last_login>=?',values:[now-DAY]}),
        week:now=>({sql:'u.last_login>=?',values:[now-7*DAY]}),
        month:now=>({sql:'u.last_login>=?',values:[now-30*DAY]}),
        dormant:now=>({sql:'u.last_login<?',values:[now-30*DAY]}),
        never:'u.last_login IS NULL',
      }),
      choice('has_projects',{yes:'EXISTS (SELECT 1 FROM projects p WHERE p.user_id=u.id)',no:'NOT EXISTS (SELECT 1 FROM projects p WHERE p.user_id=u.id)'}),
      range('created','u.created'),
    ],
    search:['u.email','u.id'],
    sorts:{
      created_desc:'u.created DESC',created_asc:'u.created ASC',email_asc:'u.email COLLATE NOCASE ASC',email_desc:'u.email COLLATE NOCASE DESC',
      last_login_desc:'u.last_login IS NULL,u.last_login DESC',last_login_asc:'u.last_login IS NULL,u.last_login ASC',
      projects_desc:'projects DESC,u.created DESC',jobs_desc:'jobs DESC,u.created DESC',
    },
    defaultSort:'created_desc',
  });
  return {users:result.items.map(user=>({...user,mfa:Boolean(user.mfa)})),...pageInfo(result)};
}

/** One account's profile and activity totals, for the administrator's user page. */
export function userSummary(userId){
  const user=get('SELECT id,email,role,active,(totp IS NOT NULL) mfa,created,last_login FROM users WHERE id=?',userId);
  if(!user)throw new ApiError(404,'NOT_FOUND','User not found');
  const today=dayKey(Date.now()),since=Date.now()-30*DAY;
  return {user:{...user,mfa:Boolean(user.mfa)},stats:{
    projects:get('SELECT count(*) n FROM projects WHERE user_id=?',userId).n,
    active_keys:get('SELECT count(*) n FROM api_keys k JOIN projects p ON p.id=k.project_id WHERE p.user_id=? AND k.revoked=0 AND (k.expires IS NULL OR k.expires>?)',userId,Date.now()).n,
    jobs:get('SELECT count(*) n FROM jobs WHERE user_id=?',userId).n,
    active_jobs:get("SELECT count(*) n FROM jobs WHERE user_id=? AND status IN ('queued','running')",userId).n,
    requests_30d:get("SELECT count(*) n FROM requests WHERE user_id=? AND created>=? AND path LIKE '/v1/%'",userId,since).n,
    errors_30d:get("SELECT count(*) n FROM requests WHERE user_id=? AND created>=? AND path LIKE '/v1/%' AND status>=400",userId,since).n,
    pages_today:get('SELECT coalesce(sum(u.pages),0) n FROM usage u JOIN projects p ON p.id=u.project_id WHERE p.user_id=? AND u.day=?',userId,today).n,
    open_feedback:get("SELECT count(*) n FROM feedback WHERE user_id=? AND coalesce(status,'open')<>'reviewed'",userId).n,
    sessions:get('SELECT count(*) n FROM sessions WHERE user_id=? AND expires>?',userId,Date.now()).n,
    last_request:get('SELECT max(created) n FROM requests WHERE user_id=?',userId).n,
  }};
}

// Audit areas are the part of the action before the first dot ("key.created" -> "key").
const auditArea=(name,column)=>({params:[name],apply(url){
  const values=url.searchParams.getAll(name).flatMap(v=>v.split(',')).map(v=>v.trim()).filter(Boolean);
  if(!values.length)return null;
  for(const v of values)if(!/^[a-z_]{1,32}$/.test(v))throw new ApiError(400,'INVALID_FILTER',`${name} must be an area name like key or user`);
  return {sql:'('+values.map(()=>`${column} LIKE ? ESCAPE '\\'`).join(' OR ')+')',values:values.map(v=>v.replace(/_/g,'\\_')+'.%')};
}});
// Events done by an account or done to it.
const involving=name=>({params:[name],apply(url){
  const value=url.searchParams.get(name);
  if(!value)return null;
  if(value.length>64)throw new ApiError(400,'INVALID_FILTER',`${name} is too long`);
  return {sql:'(a.actor=? OR a.target=?)',values:[value,value]};
}});

export function listAudit(url){
  const result=list(db,url,{
    select:'a.*,(SELECT email FROM users WHERE id=a.actor) actor_email',
    from:'audit a',
    filters:[auditArea('area','a.action'),equals('action','a.action'),equals('actor','a.actor'),involving('user'),range('created','a.created')],
    search:['a.action','a.target','a.details'],
    sorts:{created_desc:'a.id DESC',created_asc:'a.id ASC'},
    defaultSort:'created_desc',
  });
  return {audit:result.items,...pageInfo(result)};
}
export const auditAreas=()=>all("SELECT DISTINCT substr(action,1,instr(action||'.','.')-1) area FROM audit ORDER BY area").map(row=>row.area).filter(Boolean);

export function listWaitlist(url){
  const result=list(db,url,{
    select:'email,created',from:'waitlist',
    filters:[range('created','created')],
    search:['email'],
    sorts:{created_desc:'created DESC',created_asc:'created ASC',email_asc:'email COLLATE NOCASE ASC',email_desc:'email COLLATE NOCASE DESC'},
    defaultSort:'created_desc',
  });
  return {entries:result.items,...pageInfo(result)};
}

export function listAttempts(url){
  const result=list(db,url,{
    select:'*',from:'attempts',
    filters:[oneOf('status','status',['ok','error']),equals('provider','provider'),equals('job_id','job_id'),range('created','created'),
      choice('speed',{slow:'duration>=3000',very_slow:'duration>=10000'}),
      choice('yield',{none:'accepted=0',some:'accepted>0'})],
    search:['job_id','error'],
    sorts:{created_desc:'id DESC',created_asc:'id ASC',duration_desc:'duration DESC,id DESC'},
    defaultSort:'created_desc',
  });
  return {attempts:result.items,...pageInfo(result)};
}

/** Totals for the Users page header, counted on the server so they stay right past any page size. */
export function userStats(){
  return get(`SELECT count(*) total,coalesce(sum(active=1),0) active,coalesce(sum(active=0),0) suspended,coalesce(sum(totp IS NOT NULL),0) mfa_on,
    coalesce(sum(role='admin'),0) admins,coalesce(sum(created>=?),0) new_week FROM users`,Date.now()-7*DAY);
}

export function waitlistStats(){
  const t=Date.now();
  return get('SELECT count(*) total,coalesce(sum(created>=?),0) last_week,coalesce(sum(created>=?),0) last_day FROM waitlist',t-7*DAY,t-DAY);
}

/** Workspace-only filters for a job's results (stored as JSON). The public /v1 results endpoint doesn't use these. */
export function resultFilters(url){
  const where=[],values=[],field=name=>`json_extract(data,'$.${name}')`;
  const q=(url.searchParams.get('q')||'').trim();
  if(q){
    if(q.length>100)throw new ApiError(400,'INVALID_SEARCH','Search text must be 100 characters or fewer');
    const pattern='%'+escapeLike(q)+'%';
    where.push(`(${field('title')} LIKE ? ESCAPE '\\' OR ${field('source_domain')} LIKE ? ESCAPE '\\')`);values.push(pattern,pattern);
  }
  const query=url.searchParams.get('query');
  if(query){if(query.length>500)throw new ApiError(400,'INVALID_FILTER','query is too long');where.push(`${field('query')}=?`);values.push(query);}
  const minWidth=url.searchParams.get('min_width');
  if(minWidth){const n=Number(minWidth);if(!Number.isInteger(n)||n<1||n>20000)throw new ApiError(400,'INVALID_FILTER','min_width must be a whole number of pixels');where.push(`${field('width')}>=?`);values.push(n);}
  const shapes={landscape:`${field('width')}>${field('height')}`,portrait:`${field('width')}<${field('height')}`,square:`${field('width')}=${field('height')}`};
  const orientation=url.searchParams.get('orientation');
  if(orientation){if(!shapes[orientation])throw new ApiError(400,'INVALID_FILTER','orientation must be landscape, portrait or square');where.push(shapes[orientation]);}
  const watermark=url.searchParams.get('watermark');
  if(watermark){
    const hints={flagged:`${field('watermark_hint')}='source_or_title_signal'`,clear:`coalesce(${field('watermark_hint')},'')<>'source_or_title_signal'`};
    if(!hints[watermark])throw new ApiError(400,'INVALID_FILTER','watermark must be flagged or clear');
    where.push(hints[watermark]);
  }
  return {sql:where.length?' AND '+where.join(' AND '):'',values,active:where.length>0};
}
// A feedback row plus the image it reports, or null once retention has removed the result.
export function feedbackView({result_data,...row}){let image=null;try{const d=result_data?JSON.parse(result_data):null;if(d)image={title:d.title||null,image_url:d.image_url||null,thumbnail_url:d.thumbnail_url||null,source_domain:d.source_domain||null};}catch{}return {...row,image};}

export const FEEDBACK_REASONS=['not_relevant','watermark','broken','other'];

export function listFeedback(auth,url){
  const admin=isAdmin(auth),project='(SELECT project_id FROM jobs WHERE id=f.job_id)';
  const result=list(db,url,{
    select:`f.*,r.data result_data,${project} project_id,(SELECT name FROM projects WHERE id=${project}) project_name`+(admin?',(SELECT email FROM users WHERE id=f.user_id) user_email':''),
    from:'feedback f LEFT JOIN results r ON r.id=f.result_id AND r.job_id=f.job_id',...scope(auth,url,'f.user_id'),
    filters:[
      choice('status',{open:"coalesce(f.status,'open')<>'reviewed'",reviewed:"f.status='reviewed'"}),
      oneOf('reason','f.reason',FEEDBACK_REASONS),
      equals('project_id',project),equals('job_id','f.job_id'),equals('user_id','f.user_id'),range('created','f.created'),
    ],
    search:['f.note','f.job_id',"json_extract(r.data,'$.source_domain')","json_extract(r.data,'$.title')"],
    sorts:{created_desc:'f.created DESC',created_asc:'f.created ASC'},
    defaultSort:'created_desc',
  });
  return {feedback:result.items.map(feedbackView),...pageInfo(result)};
}

/** A project's webhook deliveries. The project must belong to the viewer, unless they are an administrator. */
export function listDeliveries(auth,url){
  const projectId=url.searchParams.get('project_id');
  const project=projectId&&get('SELECT id,user_id FROM projects WHERE id=?',projectId);
  if(!project||(!isAdmin(auth)&&project.user_id!==auth.user_id))throw new ApiError(404,'NOT_FOUND','Project not found');
  const result=list(db,url,{
    select:'id,event,job_id,status,attempts,last_status,last_error,created,delivered,next_at',from:'webhook_deliveries',
    where:['project_id=?'],params:[project.id],
    filters:[oneOf('status','status',['pending','delivered','failed']),oneOf('event','event',['job.finished','webhook.test']),range('created','created')],
    search:['job_id','id','last_error'],
    sorts:{created_desc:'created DESC,rowid DESC',created_asc:'created ASC,rowid ASC'},
    defaultSort:'created_desc',
  });
  return {deliveries:result.items,...pageInfo(result)};
}

const LOOKUP_LIMIT=5;
/**
 * Quick search for the command menu: IDs, key prefixes, project names, job queries and (for administrators)
 * account emails. Customers only ever see their own rows.
 */
export function lookup(auth,url){
  const q=(url.searchParams.get('q')||'').trim();
  if(q.length<2)return {users:[],jobs:[],keys:[],projects:[],requests:[]};
  if(q.length>100)throw new ApiError(400,'INVALID_SEARCH','Search text must be 100 characters or fewer');
  const admin=isAdmin(auth),like='%'+escapeLike(q)+'%',prefix=escapeLike(q)+'%',esc=" ESCAPE '\\'";
  const own=column=>admin?{sql:'',values:[]}:{sql:` AND ${column}=?`,values:[auth.user_id]};
  const jobsScope=own('j.user_id'),keysScope=own('p.user_id'),projectsScope=own('p.user_id'),requestsScope=own('r.user_id');
  return {
    users:admin?all(`SELECT id,email,role,active FROM users WHERE (email LIKE ?${esc} OR id LIKE ?${esc}) ORDER BY created DESC LIMIT ?`,like,prefix,LOOKUP_LIMIT):[],
    jobs:all(`SELECT j.id,j.status,(SELECT query FROM tasks WHERE job_id=j.id ORDER BY rowid LIMIT 1) query FROM jobs j WHERE (j.id LIKE ?${esc} OR EXISTS (SELECT 1 FROM tasks t WHERE t.job_id=j.id AND t.query LIKE ?${esc}))${jobsScope.sql} ORDER BY j.created DESC LIMIT ?`,prefix,like,...jobsScope.values,LOOKUP_LIMIT),
    keys:all(`SELECT k.id,k.name,k.prefix,p.name project FROM api_keys k JOIN projects p ON p.id=k.project_id WHERE (k.prefix LIKE ?${esc} OR k.name LIKE ?${esc} OR k.id LIKE ?${esc})${keysScope.sql} ORDER BY k.created DESC LIMIT ?`,prefix,like,prefix,...keysScope.values,LOOKUP_LIMIT),
    projects:all(`SELECT p.id,p.name FROM projects p WHERE (p.name LIKE ?${esc} OR p.id LIKE ?${esc})${projectsScope.sql} ORDER BY p.created DESC LIMIT ?`,like,prefix,...projectsScope.values,LOOKUP_LIMIT),
    requests:/^req_/i.test(q)?all(`SELECT r.id,r.method,r.path,r.status FROM requests r WHERE r.id LIKE ?${esc}${requestsScope.sql} ORDER BY r.created DESC LIMIT ?`,prefix,...requestsScope.values,LOOKUP_LIMIT):[],
  };
}
