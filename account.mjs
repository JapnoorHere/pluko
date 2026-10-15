import {get,all,run,tx,audit,now} from './db.mjs';
import {hash} from './security.mjs';

// A short, human label for a session list. Not used for any security decision.
export function deviceLabel(agent='') {
  const ua=String(agent).slice(0,400);
  const browser=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':null;
  const system=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iOS/.test(ua)?'iOS':/Mac OS X|Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':null;
  if(!browser&&!system)return 'Unknown device';
  return [browser||'Browser',system&&`on ${system}`].filter(Boolean).join(' ');
}

// Removes a project and everything stored for it. Runs inside the caller's transaction when nested.
export function deleteProject(projectId) {
  return tx(()=>{
    run('DELETE FROM webhook_deliveries WHERE project_id=?',projectId);
    run('DELETE FROM feedback WHERE job_id IN (SELECT id FROM jobs WHERE project_id=?)',projectId);
    run('DELETE FROM attempts WHERE job_id IN (SELECT id FROM jobs WHERE project_id=?)',projectId);
    run('DELETE FROM jobs WHERE project_id=?',projectId);
    run('DELETE FROM usage WHERE project_id=?',projectId);
    run('DELETE FROM api_keys WHERE project_id=?',projectId);
    run('DELETE FROM projects WHERE id=?',projectId);
  });
}

// Personal data held about one account. Image result URLs are exported per job from the dashboard.
export function exportAccount(userId) {
  const user=get('SELECT id,email,role,active,created,(totp IS NOT NULL) mfa FROM users WHERE id=?',userId);
  if(!user)return null;
  return {
    format_version:1,
    exported_at:now(),
    account:{...user,mfa:!!user.mfa},
    projects:all('SELECT id,name,daily_pages,webhook_url,created FROM projects WHERE user_id=? ORDER BY created',userId),
    api_keys:all('SELECT k.id,k.name,k.project_id,k.prefix,k.scopes,k.expires,k.revoked,k.last_used,k.created FROM api_keys k JOIN projects p ON p.id=k.project_id WHERE p.user_id=? ORDER BY k.created',userId).map(key=>({...key,scopes:JSON.parse(key.scopes)})),
    jobs:all('SELECT id,project_id,status,created,updated,payload FROM jobs WHERE user_id=? ORDER BY created DESC LIMIT 1000',userId).map(job=>({...job,payload:JSON.parse(job.payload)})),
    feedback:all('SELECT id,job_id,result_id,reason,note,status,created FROM feedback WHERE user_id=? ORDER BY created',userId),
    note:'API key secrets and password hashes are never exported. Jobs are limited to the latest 1,000.',
  };
}

// Permanently deletes an account and its data. Audit history is kept but no longer names the account.
export function deleteAccount(userId) {
  return tx(()=>{
    const user=get('SELECT * FROM users WHERE id=?',userId);
    if(!user)return false;
    for(const {id} of all('SELECT id FROM projects WHERE user_id=?',userId))deleteProject(id);
    run('DELETE FROM feedback WHERE user_id=?',userId);
    run('DELETE FROM requests WHERE user_id=?',userId);
    run('DELETE FROM sessions WHERE user_id=?',userId);
    run('DELETE FROM tokens WHERE email=?',user.email);
    run('UPDATE audit SET actor=NULL WHERE actor=?',userId);
    run('UPDATE audit SET target=NULL WHERE target=?',userId);
    run('DELETE FROM users WHERE id=?',userId);
    audit(null,'account.deleted',hash(userId).slice(0,16),{role:user.role});
    return true;
  });
}
