import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.dirname(fileURLToPath(import.meta.url));
export const config={port:Number(process.env.PORT||4180),host:process.env.HOST||'127.0.0.1',data:path.resolve(process.env.DATA_DIR||path.join(root,'data')),origin:process.env.PUBLIC_ORIGIN||'http://127.0.0.1:4180',production:process.env.NODE_ENV==='production',trustProxy:process.env.TRUST_PROXY==='true'};
const originHost=new URL(config.origin).hostname;
const localOrigin=['127.0.0.1','localhost','::1'].includes(originHost);
if(config.production&&!localOrigin&&!config.origin.startsWith('https://'))throw new Error('Production requires an HTTPS PUBLIC_ORIGIN');
if(config.production&&!localOrigin&&!/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY||''))throw new Error('Production requires a 64-character hexadecimal ENCRYPTION_KEY');
