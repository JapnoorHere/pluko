import {id,run,now,cleanup} from './db.mjs';
import {tick} from './jobs.mjs';
import {selectProvider} from './providers.mjs';
const worker=id('worker'),provider=selectProvider();let stopping=false,lastClean=0;
process.on('SIGTERM',()=>stopping=true);process.on('SIGINT',()=>stopping=true);
console.log(`Pluko worker started (provider: ${provider.name})`);
while(!stopping){try{run('INSERT INTO workers VALUES(?,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat',worker,now());if(now()-lastClean>3600000){cleanup();lastClean=now();}await tick(worker,provider);}catch(e){console.error('Worker error:',e.message);}if(!stopping)await new Promise(r=>setTimeout(r,1000));}
run('DELETE FROM workers WHERE id=?',worker);
