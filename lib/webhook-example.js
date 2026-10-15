// Shown in the dashboard and in the public docs, so the two never disagree.
export const VERIFY_SNIPPET=`import {createHmac,timingSafeEqual} from 'node:crypto';

// rawBody must be the exact request body string, before any JSON parsing.
export function verify(secret,header,rawBody){
  const parts=Object.fromEntries(header.split(',').map(part=>part.split('=')));
  if(Math.abs(Date.now()-Number(parts.t))>300000)return false; // reject replays
  const expected=createHmac('sha256',secret).update(\`\${parts.t}.\${rawBody}\`).digest('hex');
  const given=Buffer.from(parts.v1||''),wanted=Buffer.from(expected);
  return given.length===wanted.length&&timingSafeEqual(given,wanted);
}`;

export const SAMPLE_EVENT={
  id:'evt_example',
  type:'job.finished',
  created:1760000000000,
  data:{
    job_id:'job_example',
    project_id:'prj_example',
    status:'complete',
    requested:'20',
    returned:20,
    queries:[{query:'city skyline',requested:'20',found:20,status:'complete',reason:'requested_count_reached'}],
    results_url:'/v1/jobs/job_example/results',
  },
};
