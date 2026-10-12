import {spawn} from 'node:child_process';
import {root} from './config.mjs';

// SQLite setup writes must finish before another process opens the same file.
// Start the API first and only start the worker after the API confirms it is listening.
let stopping=false,worker;
const api=spawn(process.execPath,['server.mjs'],{cwd:root,stdio:['inherit','pipe','inherit'],env:process.env});
api.stdout.on('data',chunk=>{
  process.stdout.write(chunk);
  if(!worker&&chunk.toString().includes('Pluko Next.js:')){
    worker=spawn(process.execPath,['worker.mjs'],{cwd:root,stdio:'inherit',env:process.env});
    worker.on('exit',()=>stop());
  }
});
function stop(){if(stopping)return;stopping=true;if(worker)worker.kill('SIGTERM');api.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);api.on('exit',()=>stop());
