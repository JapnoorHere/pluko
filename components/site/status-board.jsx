'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Cpu,Globe,Image as ImageIcon,RefreshCw} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {CodeBlock,Reveal} from './ui';
import site from '@/components/design/design.module.css';

const REFRESH_MS=30000;

const COMPONENTS=[
  ['api',Globe,'API','Accepts requests from your backend and the dashboard.',data=>data.api==='ok','Accepting requests','Not responding'],
  ['worker',Cpu,'Search worker','Runs search jobs in the background.',data=>data.worker==='online','Processing searches','Offline: new searches wait in the queue'],
  ['provider',ImageIcon,'Image source','Where image results come from.',data=>data.provider==='enabled','Enabled','Paused by an operator: queued searches are held'],
];

const STATES={
  checking:['Checking…','Contacting the service.','bg-muted-foreground'],
  ok:['All systems working.','Searches are being accepted and processed normally.','bg-emerald-500'],
  degraded:['Searches are delayed.','The API is up, but searches are waiting. New ones still queue and will run when it recovers.','bg-amber-500'],
  down:['We can’t reach Pluko.','Your connection or the service may be down. Try again shortly.','bg-rose-500'],
};

function secondsAgo(time,now){
  const seconds=Math.max(0,Math.round((now-time)/1000));
  return seconds<5?'just now':`${seconds} seconds ago`;
}

export function StatusBoard(){
  const [data,setData]=useState(null),[failed,setFailed]=useState(false),[loading,setLoading]=useState(false),[now,setNow]=useState(()=>Date.now());
  const check=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await fetch('/v1/status',{cache:'no-store'});
      if(!response.ok)throw new Error('bad status');
      setData(await response.json());setFailed(false);
    }catch{setFailed(true);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{check();const timer=setInterval(check,REFRESH_MS);return()=>clearInterval(timer);},[check]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);

  const state=failed?'down':!data?'checking':data.status==='ok'?'ok':'degraded';
  const [title,text,dot]=STATES[state];
  return <>
    <section className="px-5 pt-36 pb-16 sm:px-8 sm:pt-44">
      <div className="mx-auto max-w-[1000px] text-center" aria-live="polite">
        <Reveal><p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm">
          <span className="relative flex size-2.5"><span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60',dot)}/><span className={cn('relative inline-flex size-2.5 rounded-full',dot)}/></span>System status
        </p></Reveal>
        <Reveal delay={60}><h1 className={site.title}>{title}</h1></Reveal>
        <Reveal delay={120}><p className={cn(site.lede,'mx-auto mt-6 max-w-xl')}>{text}</p></Reveal>
        <Reveal delay={180} className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row">
          <span>{data?`Checked ${secondsAgo(data.checked_at,now)} · refreshes every 30 seconds`:failed?'The last check failed.':'Running the first check…'}</span>
          <Button type="button" variant="outline" className="rounded-full" disabled={loading} onClick={check}><RefreshCw className={loading?'animate-spin':undefined}/>Check now</Button>
        </Reveal>
      </div>
    </section>

    <section className="px-5 pb-24 sm:px-8">
      <ul className="mx-auto grid max-w-[1000px] gap-4 md:grid-cols-3">
        {COMPONENTS.map(([key,Icon,name,description,isOk,good,bad],index)=>{
          const ok=data&&!failed?isOk(data):null;
          return <Reveal as="li" key={key} delay={index*60} className={cn('rounded-3xl border p-6',ok===false&&'border-amber-500/40 bg-amber-500/[0.04]')}>
            <div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-2xl bg-muted"><Icon className="size-5"/></span>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium',ok===null?'bg-muted text-muted-foreground':ok?'bg-emerald-500/12 text-emerald-700':'bg-amber-500/15 text-amber-700')}>{ok===null?(failed?'Unknown':'Checking'):ok?'Operational':'Attention'}</span></div>
            <p className="mt-5 text-lg font-semibold tracking-tight">{name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <p className={cn('mt-4 border-t pt-4 text-sm',ok===false?'text-amber-700':'text-foreground/80')}>{ok===null?'—':ok?good:bad}</p>
          </Reveal>;
        })}
      </ul>
    </section>

    <section className="border-t px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1000px] gap-12 md:grid-cols-2">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">About this page</h2>
          <div className="mt-5 grid gap-4 text-[17px] leading-relaxed text-foreground/75">
            <p>This is a live check, not a history. Pluko doesn’t record uptime percentages or past incidents yet, so none are shown here.</p>
            <p>If something looks wrong while this page says all is well, <Link href="/contact" className="text-[var(--accent-ink)] underline underline-offset-2">let us know</Link>.</p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">Check it from code</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-foreground/75">The same check is available without an API key.</p>
          <CodeBlock className="mt-5" title="GET /v1/status" code={`curl "$PLUKO_URL/v1/status"`}/>
        </Reveal>
      </div>
    </section>
  </>;
}
