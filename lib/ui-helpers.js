// Small pure helpers for the dashboard UI. Kept free of React and the DOM so node:test can cover them.

const UNITS=[['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60]];

// "3 minutes ago", "in 2 days", or "just now" for anything under a minute either way.
export function timeAgo(timestamp,now=Date.now()){
  if(!timestamp)return '—';
  const seconds=Math.round((timestamp-now)/1000);
  if(Math.abs(seconds)<60)return 'just now';
  const [unit,size]=UNITS.find(([,size])=>Math.abs(seconds)>=size);
  const value=Math.trunc(seconds/size);
  return new Intl.RelativeTimeFormat('en',{numeric:'auto'}).format(value,unit);
}

export function formatDuration(ms){
  if(ms===null||ms===undefined||Number.isNaN(Number(ms)))return '—';
  const value=Number(ms);
  if(value<1000)return `${Math.round(value)} ms`;
  if(value<60000)return `${(value/1000).toFixed(value<10000?1:0)} s`;
  return `${Math.floor(value/60000)}m ${Math.round((value%60000)/1000)}s`;
}

export function compactNumber(value){
  const number=Number(value)||0;
  return new Intl.NumberFormat('en',{notation:number>=10000?'compact':'standard',maximumFractionDigits:1}).format(number);
}

export function percent(part,whole){
  if(!whole)return 0;
  return Math.max(0,Math.min(100,Math.round((Number(part)/Number(whole))*100)));
}

// Every dashboard view, with the portal it belongs to. Unknown segments fall back to overview.
export const CUSTOMER_VIEWS=['overview','playground','jobs','projects','keys','logs','feedback','guide','account'];
export const ADMIN_VIEWS=['users','waitlist','provider','audit','storage','settings'];
export const ACCOUNT_TABS=['profile','security','sessions','appearance','data'];
export const PROJECT_TABS=['overview','keys','webhook','settings'];
export const USER_TABS=['overview','projects','keys','jobs','logs','audit'];

// "/app/jobs/job_123" -> {base:'/app', view:'jobs', id:'job_123', tab:null}
export function parseRoute(pathname,audience='customer'){
  const base=audience==='admin'?'/admin':'/app';
  const rest=String(pathname||'').startsWith(base)?pathname.slice(base.length):'';
  const [view='',id=null,tab=null]=rest.split('/').filter(Boolean).map(part=>decodeURIComponent(part));
  const allowed=audience==='admin'?[...CUSTOMER_VIEWS,...ADMIN_VIEWS]:CUSTOMER_VIEWS;
  if(!allowed.includes(view))return {base,view:'overview',id:null,tab:null};
  if(view==='account')return {base,view,id:null,tab:ACCOUNT_TABS.includes(id)?id:'profile'};
  if(view==='projects'&&id)return {base,view,id,tab:PROJECT_TABS.includes(tab)?tab:'overview'};
  if(view==='users'&&id&&audience==='admin')return {base,view,id,tab:USER_TABS.includes(tab)?tab:'overview'};
  return {base,view,id:['jobs','projects'].includes(view)?id:null,tab:null};
}

export function routePath(base,view,id,tab){
  return [base,view,id,tab].filter(Boolean).map((part,index)=>index?encodeURIComponent(part):part).join('/');
}

// A rough strength score from 0 to 4 for new-password fields. The server only enforces 12+ characters.
export function passwordStrength(password){
  const value=String(password||'');
  if(!value)return {score:0,label:'',met:false};
  let score=0;
  if(value.length>=12)score++;
  if(value.length>=16)score++;
  if(/[a-z]/.test(value)&&/[A-Z]/.test(value))score++;
  if(/\d/.test(value)&&/[^A-Za-z0-9]/.test(value))score++;
  if(value.length<12)score=Math.min(score,1);
  const labels=['Too short','Weak','Fair','Good','Strong'];
  return {score,label:value.length<12?'Too short':labels[score],met:value.length>=12};
}

export function initials(email){
  const name=String(email||'?').split('@')[0].replace(/[^a-zA-Z0-9]+/g,' ').trim();
  const parts=name.split(' ').filter(Boolean);
  return ((parts[0]?.[0]||'?')+(parts[1]?.[0]||'')).toUpperCase();
}

// Status words used across jobs, keys, users and deliveries mapped to a badge tone.
const TONES={
  running:'info',queued:'info',pending:'info',
  complete:'success',delivered:'success',active:'success',reviewed:'success',ok:'success',enabled:'success',
  partial:'warning',downrank:'warning',open:'warning',expiring:'warning',
  cancelled:'neutral',revoked:'neutral',expired:'neutral',
  failed:'danger',error:'danger',suspended:'danger',block:'danger',
};
export const statusTone=status=>TONES[String(status||'').toLowerCase()]||'neutral';

export function httpTone(status){
  const code=Number(status);
  if(!code)return 'danger';
  if(code>=500)return 'danger';
  if(code>=400)return 'warning';
  return 'success';
}

// Sums usage history rows ({day:'YYYY-MM-DD', pages}) into the last `days` UTC days, oldest first, zero-filled.
export function dailySeries(rows,days=7,now=Date.now()){
  const totals=new Map();
  for(const row of rows||[])totals.set(row.day,(totals.get(row.day)||0)+Number(row.pages||0));
  return Array.from({length:days},(_,index)=>{
    const date=new Date(now-(days-1-index)*86400000),day=date.toISOString().slice(0,10);
    return {day,label:date.toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}),short:date.toLocaleDateString('en',{weekday:'short',timeZone:'UTC'}),value:totals.get(day)||0};
  });
}

export function matches(row,query,fields){
  const needle=String(query||'').trim().toLowerCase();
  if(!needle)return true;
  return fields.some(field=>String(typeof field==='function'?field(row):row[field]??'').toLowerCase().includes(needle));
}

// The settings endpoint replaces every value at once, so changes are merged onto the current settings.
export function settingsPayload(settings,changes={}){
  return {
    provider_enabled:changes.provider_enabled??settings.provider_enabled==='true',
    self_signup_enabled:changes.self_signup_enabled??settings.self_signup_enabled==='true',
    prelaunch_enabled:changes.prelaunch_enabled??settings.prelaunch_enabled==='true',
    body_days:Number(changes.body_days??settings.body_days),summary_days:Number(changes.summary_days??settings.summary_days),
    job_days:Number(changes.job_days??settings.job_days),audit_days:Number(changes.audit_days??settings.audit_days),
  };
}
