import {backup} from 'node:sqlite';
import {writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {db,get,run,now,audit} from './db.mjs';
import {secret,hash} from './security.mjs';
import {root,config} from './config.mjs';
const command=process.argv[2];
if(command==='bootstrap'){
  if(get('SELECT count(*) n FROM users').n)throw new Error('Already initialized');
  const email=process.argv[3]||'admin@pluko.local';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email');
  const token=secret();run("DELETE FROM tokens WHERE kind='bootstrap'");run('INSERT INTO tokens VALUES(?,?,?,?,?)',hash(token),email,'bootstrap',now()+86400000,now());
  writeFileSync(path.join(root,'LOCAL-SETUP.txt'),`PLUKO — LOCAL FIRST ADMIN SETUP\n\nOpen: ${config.origin}/#accept=${token}\nEmail: ${email}\n\nChoose your own password, then sign in and enroll an authenticator.\nThis link is single-use and expires in 24 hours. Do not share it.\n`,{mode:0o600});console.log('Initial setup link saved to LOCAL-SETUP.txt. No default password is created.');
}else if(command==='backup'){
  mkdirSync(path.join(config.data,'backups'),{recursive:true});const f=path.join(config.data,'backups','pluko-'+now()+'.sqlite');await backup(db,f);console.log(f);
}else if(command==='recover-mfa'){
  const email=process.argv[3];const u=get('SELECT * FROM users WHERE email=?',email);if(!u)throw new Error('User not found');run('UPDATE users SET totp=NULL,last_totp=-1 WHERE id=?',u.id);run('DELETE FROM sessions WHERE user_id=?',u.id);audit('local-operator','mfa.recovered',u.id);console.log('MFA reset. The administrator must enroll again after signing in.');
}else throw new Error('Usage: node manage.mjs bootstrap [email] | backup | recover-mfa email');
db.close();
