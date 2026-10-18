import http from 'node:http';
import next from 'next';
import {config,root} from './config.mjs';
import {createServer as createApiServer} from './api-server.mjs';
import {get,setting} from './db.mjs';
import {hash} from './security.mjs';

const dev = process.env.NODE_ENV !== 'production';
const app = next({dev,dir:root});
const nextHandler = app.getRequestHandler();
const api = createApiServer();

// Pre-launch mode: "/" shows the coming-soon page and other pages redirect to it.
// The admin portal, legal pages and static files stay reachable. Signed-in administrators see the full site.
const PRELAUNCH_OPEN = new Set(['/','/coming-soon','/privacy','/terms','/robots.txt','/sitemap.xml','/opengraph-image','/admin']);
const opensDuringPrelaunch = pathname => PRELAUNCH_OPEN.has(pathname) || pathname.startsWith('/admin/') || pathname.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(pathname);

function isAdmin(req){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pluko_session='))?.slice(14);
  if(!token)return false;
  return get('SELECT u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.active=1',hash(token),Date.now())?.role==='admin';
}

function redirectHome(res){
  res.writeHead(307,{Location:'/','Cache-Control':'no-store'});
  res.end();
}

await app.prepare();
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,config.origin);
  const pathname = url.pathname;
  if(pathname==='/health'||pathname.startsWith('/api/')||pathname.startsWith('/v1/')) {
    api.emit('request',req,res);
    return;
  }
  const prelaunch = setting('prelaunch_enabled')==='true';
  if(prelaunch){
    if(pathname==='/'){if(!isAdmin(req))req.url='/coming-soon'+url.search;}
    else if(!opensDuringPrelaunch(pathname)&&!isAdmin(req))return redirectHome(res);
  }else if(pathname==='/coming-soon'&&!isAdmin(req))return redirectHome(res);
  nextHandler(req,res);
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.listen(config.port,config.host,()=>console.log(`Pluko Next.js: ${config.origin}`));
process.on('SIGTERM',()=>server.close());
process.on('SIGINT',()=>server.close());
