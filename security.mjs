import {scrypt as scryptCallback,randomBytes,createHash,timingSafeEqual,createHmac,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {config} from './config.mjs';
const scrypt=promisify(scryptCallback);
export const secret=()=>randomBytes(32).toString('base64url');
export const hash=s=>createHash('sha256').update(s).digest('hex');
export async function passwordHash(password){if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('Password must be 12–256 characters');const salt=secret();const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex');}
export async function passwordCheck(password,stored){if(typeof password!=='string'||password.length>256)return false;const [salt,hex]=stored.split(':');const key=await scrypt(password,salt,64);return timingSafeEqual(key,Buffer.from(hex,'hex'));}
export function redact(v){if(Array.isArray(v))return v.map(redact);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,/(password|secret|token|authorization|cookie|csrf|totp|code|uri|link)/i.test(k)?'[REDACTED]':redact(x)]));return typeof v==='string'?v.replace(/plk_(live|test)_[A-Za-z0-9_-]+/g,'[REDACTED_KEY]'):v;}
let key;
function encryptionKey(){if(key)return key;const f=path.join(config.data,'secret.key');if(process.env.ENCRYPTION_KEY){key=Buffer.from(process.env.ENCRYPTION_KEY,'hex');if(key.length!==32)throw new Error('ENCRYPTION_KEY must be 64 hex characters');return key;}if(!existsSync(f))writeFileSync(f,randomBytes(32),{mode:0o600,flag:'wx'});key=readFileSync(f);return key;}
export function seal(text){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',encryptionKey(),iv);const data=Buffer.concat([c.update(text,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64');}
export function unseal(text){const b=Buffer.from(text,'base64'),c=createDecipheriv('aes-256-gcm',encryptionKey(),b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8');}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotp(){let bits='';for(const b of randomBytes(20))bits+=b.toString(2).padStart(8,'0');return bits.match(/.{5}/g).map(x=>alphabet[parseInt(x,2)]).join('');}
export function totp(secret,counter=Math.floor(Date.now()/30000)){let bits='';for(const c of secret)bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');const bytes=Buffer.from(bits.match(/.{8}/g).map(x=>parseInt(x,2)));const msg=Buffer.alloc(8);msg.writeBigUInt64BE(BigInt(counter));const h=createHmac('sha1',bytes).update(msg).digest(),o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0');}
export function checkTotp(secret,code,last=-1){if(!/^\d{6}$/.test(String(code)))return null;const n=Math.floor(Date.now()/30000);for(const c of [n-1,n,n+1])if(c>last&&timingSafeEqual(Buffer.from(totp(secret,c)),Buffer.from(String(code))))return c;return null;}
