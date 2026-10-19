import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {config} from './config.mjs';
mkdirSync(config.data,{recursive:true,mode:0o700});
export const db=new DatabaseSync(path.join(config.data,'pluko.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;
CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',active INTEGER NOT NULL DEFAULT 1,totp TEXT,last_totp INTEGER DEFAULT -1,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,email TEXT NOT NULL,kind TEXT NOT NULL,expires INTEGER NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,daily_pages INTEGER NOT NULL DEFAULT 200,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS api_keys(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),name TEXT NOT NULL,hash TEXT NOT NULL UNIQUE,prefix TEXT NOT NULL,scopes TEXT NOT NULL,expires INTEGER,revoked INTEGER NOT NULL DEFAULT 0,last_used INTEGER,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),project_id TEXT NOT NULL REFERENCES projects(id),key_id TEXT REFERENCES api_keys(id),payload TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,cancel INTEGER NOT NULL DEFAULT 0,idempotency TEXT,UNIQUE(project_id,idempotency));
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,query TEXT NOT NULL,requested TEXT NOT NULL,found INTEGER NOT NULL DEFAULT 0,page INTEGER NOT NULL DEFAULT 0,empty_pages INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,reason TEXT,lease_owner TEXT,lease_until INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS results(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,url TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(task_id,url));
CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,user_id TEXT,project_id TEXT,key_id TEXT,method TEXT NOT NULL,path TEXT NOT NULL,payload TEXT,response TEXT,status INTEGER,duration INTEGER,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,job_id TEXT,task_id TEXT,provider TEXT,page INTEGER,status TEXT,duration INTEGER,candidates INTEGER,accepted INTEGER,error TEXT,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT NOT NULL,target TEXT,details TEXT,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,user_id TEXT,job_id TEXT,result_id TEXT,reason TEXT,note TEXT,status TEXT NOT NULL DEFAULT 'open',created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usage(project_id TEXT NOT NULL,day TEXT NOT NULL,pages INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(project_id,day));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rules(domain TEXT PRIMARY KEY,action TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS workers(id TEXT PRIMARY KEY,heartbeat INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS tasks_queue ON tasks(status,next_at,updated);
CREATE INDEX IF NOT EXISTS results_job ON results(job_id,seq);
CREATE INDEX IF NOT EXISTS requests_user ON requests(user_id,created);
CREATE INDEX IF NOT EXISTS requests_created ON requests(created);
CREATE INDEX IF NOT EXISTS jobs_user ON jobs(user_id,created);
CREATE INDEX IF NOT EXISTS attempts_job ON attempts(job_id,id);
INSERT OR IGNORE INTO migrations VALUES(1,unixepoch()*1000);
INSERT OR IGNORE INTO settings VALUES('provider_enabled','true'),('body_days','30'),('summary_days','90'),('job_days','30'),('audit_days','365'),('self_signup_enabled','true');`);
if(!db.prepare('SELECT 1 FROM migrations WHERE version=2').get()){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.prepare("UPDATE feedback SET reason='not_relevant' WHERE reason NOT IN ('not_relevant','watermark','broken','other')").run();
    db.prepare('INSERT INTO migrations(version,applied) VALUES(2,?)').run(Date.now());
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
if(!db.prepare('SELECT 1 FROM migrations WHERE version=3').get()){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`ALTER TABLE sessions ADD COLUMN label TEXT;
ALTER TABLE projects ADD COLUMN webhook_url TEXT;
ALTER TABLE projects ADD COLUMN webhook_secret TEXT;
CREATE TABLE IF NOT EXISTS webhook_deliveries(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,job_id TEXT NOT NULL,event TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,last_status INTEGER,last_error TEXT,created INTEGER NOT NULL,delivered INTEGER);
CREATE INDEX IF NOT EXISTS webhook_due ON webhook_deliveries(status,next_at);
CREATE INDEX IF NOT EXISTS webhook_project ON webhook_deliveries(project_id,created);`);
    db.prepare('INSERT INTO migrations(version,applied) VALUES(3,?)').run(Date.now());
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
// 4: pre-launch mode. A waitlist of emails from the coming-soon page, and the switch that turns the mode on (off by default).
if(!db.prepare('SELECT 1 FROM migrations WHERE version=4').get()){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`CREATE TABLE IF NOT EXISTS waitlist(email TEXT PRIMARY KEY,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS waitlist_created ON waitlist(created);
INSERT OR IGNORE INTO settings VALUES('prelaunch_enabled','false');`);
    db.prepare('INSERT INTO migrations(version,applied) VALUES(4,?)').run(Date.now());
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
// 5: filtered, paginated workspace lists. Indexes for the common filters, and when each user last signed in.
if(!db.prepare('SELECT 1 FROM migrations WHERE version=5').get()){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`ALTER TABLE users ADD COLUMN last_login INTEGER;
CREATE INDEX IF NOT EXISTS jobs_project ON jobs(project_id,created);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,created);
CREATE INDEX IF NOT EXISTS requests_project ON requests(project_id,created);
CREATE INDEX IF NOT EXISTS requests_key ON requests(key_id,created);
CREATE INDEX IF NOT EXISTS audit_actor ON audit(actor,id);
CREATE INDEX IF NOT EXISTS audit_action ON audit(action,id);
CREATE INDEX IF NOT EXISTS feedback_user ON feedback(user_id,created);
CREATE INDEX IF NOT EXISTS feedback_status ON feedback(status,created);
CREATE INDEX IF NOT EXISTS keys_project ON api_keys(project_id,created);
CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id,created);
CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created);`);
    db.prepare('INSERT INTO migrations(version,applied) VALUES(5,?)').run(Date.now());
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
// 6: how each project gets its results: 'poll' (check back), 'wait' (the search call waits) or 'webhook'.
// Projects that already have a webhook keep using it.
if(!db.prepare('SELECT 1 FROM migrations WHERE version=6').get()){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`ALTER TABLE projects ADD COLUMN delivery TEXT NOT NULL DEFAULT 'poll';
ALTER TABLE projects ADD COLUMN wait_seconds INTEGER NOT NULL DEFAULT 10;
UPDATE projects SET delivery='webhook' WHERE webhook_url IS NOT NULL;`);
    db.prepare('INSERT INTO migrations(version,applied) VALUES(6,?)').run(Date.now());
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
export const now=()=>Date.now();
export const id=prefix=>prefix+'_'+randomUUID().replaceAll('-','');
export const get=(sql,...p)=>db.prepare(sql).get(...p);
export const all=(sql,...p)=>db.prepare(sql).all(...p);
export const run=(sql,...p)=>db.prepare(sql).run(...p);
let depth=0;
export function tx(fn){const level=depth++;db.exec(level?'SAVEPOINT nested_'+level:'BEGIN IMMEDIATE');try{const result=fn();db.exec(level?'RELEASE nested_'+level:'COMMIT');return result;}catch(e){db.exec(level?'ROLLBACK TO nested_'+level:'ROLLBACK');if(level)db.exec('RELEASE nested_'+level);throw e;}finally{depth--;}}
export function audit(actor,action,target,details={}){run('INSERT INTO audit(actor,action,target,details,created) VALUES(?,?,?,?,?)',actor||null,action,target||null,JSON.stringify(details),now());}
export function setting(key){return get('SELECT value FROM settings WHERE key=?',key)?.value;}
export function rate(bucket,max,ms){return tx(()=>{run('DELETE FROM rate_limits WHERE bucket=? AND expires<=?',bucket,now());const r=get('SELECT * FROM rate_limits WHERE bucket=?',bucket);if(r&&r.count>=max)return false;run('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1',bucket,now()+ms);return true;});}
export function cleanup(table){const t=now(),day=86400000;tx(()=>{
  const tasks={
    requests:()=>{run('UPDATE requests SET payload=NULL,response=NULL WHERE created<?',t-Number(setting('body_days'))*day);run('DELETE FROM requests WHERE created<?',t-Number(setting('summary_days'))*day);},
    attempts:()=>run('DELETE FROM attempts WHERE created<?',t-Number(setting('summary_days'))*day),
    jobs:()=>run("DELETE FROM jobs WHERE updated<? AND status NOT IN ('queued','running')",t-Number(setting('job_days'))*day),
    audit:()=>run('DELETE FROM audit WHERE created<?',t-Number(setting('audit_days'))*day),
    feedback:()=>run('DELETE FROM feedback WHERE created<?',t-Number(setting('summary_days'))*day),
    webhook_deliveries:()=>run("DELETE FROM webhook_deliveries WHERE created<? AND status<>'pending'",t-Number(setting('summary_days'))*day),
    sessions:()=>run('DELETE FROM sessions WHERE expires<?',t),
    tokens:()=>run('DELETE FROM tokens WHERE expires<?',t),
    rate_limits:()=>run('DELETE FROM rate_limits WHERE expires<?',t),
    usage:()=>run('DELETE FROM usage WHERE day<?',new Date(t-365*day).toISOString().slice(0,10)),
  };
  if(table){if(!tasks[table])throw new Error('Unsupported cleanup table');tasks[table]();return;}
  for(const clean of Object.values(tasks))clean();
});}
