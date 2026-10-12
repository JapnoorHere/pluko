import http from 'node:http';
import next from 'next';
import {config,root} from './config.mjs';
import {createServer as createApiServer} from './api-server.mjs';

const dev = process.env.NODE_ENV !== 'production';
const app = next({dev,dir:root});
const nextHandler = app.getRequestHandler();
const api = createApiServer();

await app.prepare();
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,config.origin).pathname;
  if(pathname==='/health'||pathname.startsWith('/api/')||pathname.startsWith('/v1/')) {
    api.emit('request',req,res);
    return;
  }
  nextHandler(req,res);
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.listen(config.port,config.host,()=>console.log(`Pluko Next.js: ${config.origin}`));
process.on('SIGTERM',()=>server.close());
process.on('SIGINT',()=>server.close());
