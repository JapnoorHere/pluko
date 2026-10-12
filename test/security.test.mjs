import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,passwordCheck,redact,totp,checkTotp} from '../security.mjs';

test('hashes and checks a password',async()=>{const h=await passwordHash('correct horse battery staple');assert.equal(await passwordCheck('correct horse battery staple',h),true);assert.equal(await passwordCheck('wrong password',h),false);});
test('redacts credential-like values before logging',()=>{const r=redact({password:'secret',api_key:'plk_live_abc',nested:{reset_link:'x'},query:'mountain landscape'});assert.deepEqual(r,{password:'[REDACTED]',api_key:'[REDACTED_KEY]',nested:{reset_link:'[REDACTED]'},query:'mountain landscape'});});
test('accepts a current TOTP code once only',()=>{const secret='JBSWY3DPEHPK3PXP';const code=totp(secret);const step=checkTotp(secret,code,-1);assert.notEqual(step,null);assert.equal(checkTotp(secret,code,step),null);});
