import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';

// Starts the real API server on a free localhost port with a throwaway database.
// Must run before anything imports config.mjs, so import api-server.mjs only through this helper.
export async function startApi(extraEnv={}) {
  const dir=mkdtempSync(path.join(os.tmpdir(),'pluko-test-'));
  const port=await new Promise(resolve=>{const probe=net.createServer();probe.listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});});
  Object.assign(process.env,{DATA_DIR:dir,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:`http://127.0.0.1:${port}`,PLUKO_PROVIDER:'mock',TRUST_PROXY:'true'},extraEnv);
  const root=new URL('../../',import.meta.url);
  const {createServer}=await import(new URL('api-server.mjs',root));
  const store=await import(new URL('db.mjs',root));
  const server=createServer();
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${port}`;

  let nextHost=10;
  class Client {
    // Every client gets its own forwarded address so per-network limits do not couple unrelated tests.
    constructor(ip=`10.20.${Math.floor(nextHost/250)}.${nextHost++%250+1}`){this.cookie='';this.csrf='';this.ip=ip;}
    async call(method,route,{body,key,headers={}}={}) {
      const sent={'x-forwarded-for':this.ip,...headers};
      if(body!==undefined)sent['content-type']='application/json';
      if(key)sent.authorization=`Bearer ${key}`;
      else if(this.cookie){sent.cookie=this.cookie;if(method==='POST'&&this.csrf)sent['x-csrf-token']=this.csrf;}
      const response=await fetch(base+route,{method,headers:sent,body:body===undefined?undefined:JSON.stringify(body)});
      const setCookie=response.headers.get('set-cookie');
      if(setCookie){const pair=setCookie.split(';')[0];this.cookie=pair.endsWith('=')?'':pair;}
      const text=await response.text();
      let json=null;try{json=JSON.parse(text);}catch{}
      return {status:response.status,json,text,headers:response.headers};
    }
    get(route,options){return this.call('GET',route,options);}
    post(route,body,options){return this.call('POST',route,{...options,body});}
    async refresh(){const response=await this.get('/api/me');this.csrf=response.json?.csrf||'';return response;}
    async register(email,password='correct horse battery staple'){const response=await this.post('/api/register',{email,password});await this.refresh();return response;}
    async login(email,password='correct horse battery staple',extra={}){const response=await this.post('/api/login',{email,password,...extra});await this.refresh();return response;}
    // Creates a project and a search+read key; returns ids and the one-time secret.
    async project(name='Test project'){
      const project=await this.post('/api/projects',{name});
      const key=await this.post('/api/keys',{project_id:project.json.id,name:'test key',days:30,scopes:['search','read']});
      return {projectId:project.json.id,keyId:key.json.id,key:key.json.secret};
    }
  }

  return {
    base,dir,store,
    client:ip=>new Client(ip),
    async close(){
      server.closeAllConnections?.();
      await new Promise(resolve=>server.close(resolve));
      try{store.db.close();}catch{}
      rmSync(dir,{recursive:true,force:true});
    },
  };
}
