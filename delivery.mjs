// How a project's app receives search results:
//   poll    - the search call returns a job ID straight away; the app checks the job until it finishes (default)
//   wait    - the search call stays open until the job finishes (up to wait_seconds), then returns the images
//   webhook - the search call returns straight away; Pluko POSTs a signed job.finished event when it finishes
// A wait is always bounded: big searches fall back to a job ID, so no HTTP request runs long.
import {get} from './db.mjs';
import {ApiError} from './jobs.mjs';

export const DELIVERY_MODES=Object.freeze(['poll','wait','webhook']);
export const WAIT=Object.freeze({min:1,max:10,default:10,checkEveryMs:250});
const FINISHED=['complete','partial','cancelled'];

const fail=(code,message)=>{throw new ApiError(400,code,message);};

/** Validates a delivery mode and wait limit from a request body. Missing values keep `current`. */
export function parseDelivery(input,current={delivery:'poll',wait_seconds:WAIT.default}){
  const delivery=input.delivery??current.delivery;
  if(!DELIVERY_MODES.includes(delivery))fail('INVALID_DELIVERY','delivery must be poll, wait or webhook');
  const wait=input.wait_seconds??current.wait_seconds;
  if(!Number.isInteger(wait)||wait<WAIT.min||wait>WAIT.max)fail('INVALID_WAIT',`wait_seconds must be a whole number from ${WAIT.min} to ${WAIT.max}`);
  return {delivery,wait_seconds:wait};
}

/**
 * How long one request should wait, in seconds (0 = don't wait).
 * The project's mode sets the default; a request can override it with `Prefer: wait=N` (RFC 7240)
 * or skip waiting with `Prefer: respond-async`. The result never exceeds WAIT.max.
 */
export function requestedWait(project,preferHeader){
  const prefer=String(preferHeader||'').toLowerCase();
  if(/(^|[,;\s])respond-async\b/.test(prefer))return 0;
  const match=/(^|[,;\s])wait\s*=\s*(\d{1,4})\b/.exec(prefer);
  if(match)return Math.min(WAIT.max,Number(match[2]));
  return project?.delivery==='wait'?Math.min(WAIT.max,project.wait_seconds||WAIT.default):0;
}

/** Parses ?wait=N for GET /v1/jobs/:id. Returns seconds, or 0 when absent. */
export function waitParam(url){
  const raw=url.searchParams.get('wait');
  if(raw===null||raw==='')return 0;
  const n=Number(raw);
  if(!Number.isInteger(n)||n<0||n>WAIT.max)fail('INVALID_WAIT',`wait must be a whole number of seconds from 0 to ${WAIT.max}`);
  return n;
}

/**
 * Resolves once the job has finished, `seconds` have passed, or the client has gone away (the response closed).
 * Returns true if the job finished. The worker runs in another process, so this checks the database.
 */
export function waitForJob(jobId,seconds,res){
  if(!seconds)return Promise.resolve(isFinished(jobId));
  const deadline=Date.now()+seconds*1000;
  return new Promise(resolve=>{
    let done=false,timer=null;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);res?.off?.('close',onClose);resolve(value);};
    const onClose=()=>finish(false);
    // A request's own 'close' fires once its body is read; the response's fires when the client disconnects.
    res?.on?.('close',onClose);
    const check=()=>{
      if(isFinished(jobId))return finish(true);
      if(Date.now()>=deadline)return finish(false);
      timer=setTimeout(check,Math.min(WAIT.checkEveryMs,Math.max(0,deadline-Date.now())));
    };
    check();
  });
}

const isFinished=jobId=>FINISHED.includes(get('SELECT status FROM jobs WHERE id=?',jobId)?.status);
