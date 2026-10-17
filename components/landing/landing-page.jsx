'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {
  Activity,ArrowRight,ArrowUpRight,Check,ClipboardList,Copy,EyeOff,FileCode2,FolderKanban,KeyRound,Layers,
  LayoutDashboard,Link2,Search,ShieldCheck,Sparkles,Webhook,Zap,DatabaseZap,BadgeInfo,
} from 'lucide-react';
import {collections,faqs,requestExample,responses} from '@/lib/marketing/content';
import {cn} from '@/lib/utils';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from '@/components/ui/accordion';
import {Button} from '@/components/ui/button';
import {Eyebrow,PublicShell,Reveal} from '@/components/site/ui';
import {HeroDemo} from './hero-demo';
import {useInView,useScrollProgress} from './hooks';
import site from '@/components/site/site.module.css';
import styles from './landing.module.css';

const ALL_PHOTOS=collections.flatMap(group=>group.photos.map(photo=>({...photo,query:group.query})));

function Photo({photo,className,eager=false}){
  const [failed,setFailed]=useState(false);
  if(failed)return <span role="img" aria-label={photo.title} className={cn('block bg-muted',className)}/>;
  return <img src={photo.url} alt={photo.title} width="480" height="360" loading={eager?'eager':'lazy'} decoding="async" onError={()=>setFailed(true)} className={cn('bg-muted object-cover',className)}/>;
}

/* ---------- Hero ---------- */

function Hero(){
  return <section className="relative px-5 pt-32 pb-24 sm:px-8 sm:pt-44 sm:pb-32">
    <div className="mx-auto max-w-[1200px] text-center">
      <Reveal><Link href="#developers" className="group mb-8 inline-flex items-center gap-2 rounded-full border bg-background/70 py-1 pr-3 pl-1 text-sm text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground">
        <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">Beta</span>Batch search, webhooks<span className="hidden sm:inline"> and a full workspace</span><ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5"/>
      </Link></Reveal>
      <Reveal delay={60}><h1 className={site.display}>Every image.<br/>One API.</h1></Reveal>
      <Reveal delay={120}><p className={cn(site.lede,'mx-auto mt-7 max-w-2xl')}>Search the web for images and get back URLs, sources and metadata your product can use. One query or thousands, in a single job.</p></Reveal>
      <Reveal delay={180} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 rounded-full px-7 text-base"><Link href="/app?mode=register">Get started<ArrowRight/></Link></Button>
        <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base"><Link href="/docs">Read the docs<ArrowUpRight/></Link></Button>
      </Reveal>
    </div>
    <Reveal delay={260} className="relative mx-auto mt-20 max-w-[1100px] sm:mt-24">
      <div className={site.glow} aria-hidden/>
      <HeroDemo/>
    </Reveal>
  </section>;
}

/* ---------- Statement: words brighten with scroll ---------- */

const STATEMENT='Pluko finds the right image, tells you where it came from, and hands it to your code as clean JSON. No scraping scripts. No stored files. No guesswork.';

function Statement(){
  const words=STATEMENT.split(' ');
  const container=useRef(null);
  const onChange=useCallback(value=>{
    const nodes=container.current?.querySelectorAll('[data-word]');
    if(!nodes)return;
    const span=nodes.length;
    nodes.forEach((node,index)=>{node.style.setProperty('--on',Math.min(1,Math.max(0,value*span*1.15-index)).toFixed(3));});
  },[]);
  const ref=useScrollProgress({start:0.8,end:0.55,onChange});
  return <section ref={ref} className="px-5 py-32 sm:px-8 sm:py-48">
    <p ref={container} className="mx-auto max-w-[1000px] text-[clamp(1.9rem,4.4vw,3.5rem)] leading-[1.12] font-semibold tracking-[-0.04em] text-balance">
      {words.map((word,index)=><span key={index} data-word className={styles.word}>{word}{index<words.length-1?' ':''}</span>)}
    </p>
  </section>;
}

/* ---------- How it works: sticky visual, steps scroll past ---------- */

const STEPS=[
  {title:'Ask.',text:'Send one query, or a batch with how many images each one needs. Pluko answers straight away with a job ID, so your request never hangs.'},
  {title:'Pluko searches.',text:'Pages are fetched in the background. Repeats are skipped, blocked sources are removed, and likely watermarked sites are ranked lower.'},
  {title:'You build.',text:'Read results a hundred at a time, or let a signed webhook tell your server the moment the job finishes.'},
];

function StepVisual({step}){
  if(step===0)return <div className="grid gap-4">
    <div className="rounded-2xl border bg-background p-5 font-mono text-[13px] leading-relaxed shadow-sm">
      <p className="mb-3 text-xs text-muted-foreground"><span className="mr-2 rounded bg-[var(--accent-ink)] px-1.5 py-0.5 font-sans font-semibold text-white">POST</span>/v1/images/search</p>
      <pre className="code-block !p-0 whitespace-pre-wrap">{`{
  "queries": [
    { "query": "concrete architecture", "count": "40" },
    { "query": "quiet mountain landscapes", "count": "40" }
  ],
  "min_width": 1200
}`}</pre>
    </div>
    <div className="flex items-center gap-3 self-start rounded-full border bg-background py-2 pr-4 pl-2 text-sm shadow-sm"><span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="size-3.5"/></span><span className="font-mono text-xs">202 Accepted · job_7f3a…</span></div>
  </div>;
  if(step===1)return <div className="grid gap-4">
    {[['concrete architecture',78],['quiet mountain landscapes',52]].map(([query,value])=><div key={query} className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-sm"><span className="font-medium">{query}</span><span className="tabular-nums text-muted-foreground">{Math.round(value*0.4)} / 40</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--accent-ink)]" style={{width:`${value}%`}}/></div>
    </div>)}
    <div className="flex flex-wrap gap-2">{['Repeats skipped','Blocked sources removed','Watermark-heavy sites ranked lower'].map(tag=><span key={tag} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm">{tag}</span>)}</div>
  </div>;
  return <div className="grid gap-4">
    <div className="grid grid-cols-3 gap-2">{collections[1].photos.slice(0,6).map(photo=><Photo key={photo.id} photo={photo} className="aspect-[4/3] w-full rounded-xl"/>)}</div>
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border bg-background px-3 py-1.5 font-mono text-xs shadow-sm">"next_cursor": null</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs shadow-sm"><Webhook className="size-3.5 text-[var(--accent-ink)]"/>job.finished → your server</span>
    </div>
  </div>;
}

function HowItWorks(){
  const [active,setActive]=useState(0);
  const refs=useRef([]);
  useEffect(()=>{
    if(!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)setActive(Number(entry.target.dataset.step));});},{rootMargin:'-45% 0px -45% 0px'});
    refs.current.forEach(node=>node&&observer.observe(node));
    return()=>observer.disconnect();
  },[]);
  return <section id="how-it-works" className="scroll-mt-16 bg-muted/40 px-5 py-28 sm:px-8 sm:py-40">
    <div className="mx-auto max-w-[1200px]">
      <Reveal className="mx-auto max-w-3xl text-center"><Eyebrow>How it works</Eyebrow><h2 className={site.headline}>Three steps.<br/>No scraping code.</h2></Reveal>
      <div className="mt-20 grid gap-16 lg:grid-cols-2 lg:gap-20">
        <div>
          {STEPS.map((step,index)=><div key={step.title} ref={node=>{refs.current[index]=node;}} data-step={index} className="flex min-h-0 flex-col justify-center gap-8 py-6 lg:min-h-[70vh]">
            <div className={cn('transition-opacity duration-500',active===index?'opacity-100':'lg:opacity-30')}>
              <p className="mb-3 font-mono text-sm text-muted-foreground">0{index+1}</p>
              <h3 className="text-[clamp(2rem,3.6vw,3rem)] leading-tight font-semibold tracking-[-0.04em]">{step.title}</h3>
              <p className={cn(site.lede,'mt-4 max-w-md')}>{step.text}</p>
            </div>
            <div className={cn(site.frame,'p-5 lg:hidden')}><StepVisual step={index}/></div>
          </div>)}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <div className={cn(site.frame,site.grain,'relative h-[min(560px,68vh)] overflow-hidden')}>
              {STEPS.map((step,index)=><div key={step.title} data-active={active===index} aria-hidden={active!==index} className={cn(styles.stepVisual,'absolute inset-0 flex items-center p-10')}><div className="w-full"><StepVisual step={index}/></div></div>)}
            </div>
            <div className="mt-6 flex justify-center gap-2" aria-hidden>{STEPS.map((step,index)=><span key={step.title} className={cn('h-1.5 rounded-full transition-all duration-500',active===index?'w-8 bg-foreground':'w-1.5 bg-foreground/20')}/>)}</div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ---------- Developers (dark band) ---------- */

const LANGS=['cURL','JavaScript','Python'];
const STAGES=['Create search','Check status','Get results'];

function CodeWindow(){
  const [language,setLanguage]=useState('cURL'),[stage,setStage]=useState(0),[copied,setCopied]=useState(false);
  const code=requestExample(language,stage);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),1500);return()=>clearTimeout(timer);},[copied]);
  const copy=async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{}};
  return <div className={cn(site.frame,'overflow-hidden text-left')}>
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
      <div role="tablist" aria-label="Request step" className="flex gap-1 rounded-full bg-muted/60 p-1">
        {STAGES.map((label,index)=><button key={label} role="tab" aria-selected={stage===index} onClick={()=>setStage(index)} className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',stage===index?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>{index+1}. {label}</button>)}
      </div>
      <div role="tablist" aria-label="Language" className="ml-auto flex gap-1">
        {LANGS.map(label=><button key={label} role="tab" aria-selected={language===label} onClick={()=>setLanguage(label)} className={cn('rounded-full px-2.5 py-1 text-xs transition-colors',language===label?'text-foreground':'text-muted-foreground hover:text-foreground')}>{label}</button>)}
      </div>
    </div>
    <div className="grid lg:grid-cols-[1.15fr_1fr]">
      <div className="relative min-w-0 border-b lg:border-r lg:border-b-0">
        <p className="px-5 pt-4 text-xs text-muted-foreground">Request</p>
        <button type="button" onClick={copy} aria-label="Copy request" className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{copied?<Check className="size-4"/>:<Copy className="size-4"/>}</button>
        <pre className="code-block h-[19rem] font-mono text-[12.5px] leading-relaxed">{code}</pre>
      </div>
      <div className="min-w-0 bg-black/20">
        <p className="px-5 pt-4 text-xs text-muted-foreground">Response <span className="ml-1 font-mono text-emerald-400">{stage===0?'202':'200'}</span></p>
        <pre className="code-block h-[19rem] font-mono text-[12.5px] leading-relaxed text-foreground/80">{JSON.stringify(responses[stage],null,2)}</pre>
      </div>
    </div>
  </div>;
}

const DEV_FEATURES=[
  [Zap,'Async by design','A search returns a job at once. Big requests are paged, never one long HTTP call.'],
  [Webhook,'Signed webhooks','HMAC-signed job.finished events with retries, so you don’t have to poll.'],
  [KeyRound,'Keys you control','Scoped, expiring keys per project. Rotate or revoke in one click.'],
  [FileCode2,'OpenAPI 3.1','Generate a typed client from the published schema.'],
];

function Developers(){
  return <section id="developers" className="scroll-mt-16 px-5 pt-28 pb-24 sm:px-8 sm:pt-40">
    <div className="mx-auto max-w-[1200px]">
      <Reveal className="max-w-3xl"><Eyebrow>For developers</Eyebrow><h2 className={site.headline}>Built for your backend.</h2><p className={cn(site.lede,'mt-6 max-w-2xl')}>A small, versioned HTTP API. Create a job, check on it, read the results. Every response carries a request ID you can trace in the dashboard.</p></Reveal>
      <Reveal delay={80} className="mt-14"><CodeWindow/></Reveal>
      <div className="mt-20 grid gap-10 border-t pt-12 sm:grid-cols-2 lg:grid-cols-4">
        {DEV_FEATURES.map(([Icon,title,text],index)=><Reveal key={title} delay={index*70}><Icon className="mb-4 size-5 text-[var(--accent-ink)]"/><h3 className="font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></Reveal>)}
      </div>
    </div>
  </section>;
}

/* ---------- Workspace (dark band, product shot grows into place) ---------- */

function WorkspaceMock(){
  const nav=[[LayoutDashboard,'Overview',true],[Sparkles,'Playground'],[FolderKanban,'Projects'],[KeyRound,'API keys'],[Search,'Search jobs'],[ClipboardList,'Request logs'],[Activity,'Quality feedback']];
  const bars=[34,48,41,62,55,82,70];
  return <div className="flex h-full text-left text-[11px] sm:text-xs" aria-hidden>
    <div className="hidden w-48 shrink-0 flex-col gap-1 border-r bg-white/[0.02] p-3 md:flex">
      <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold"><img src="/logo.svg" width="22" height="22" alt=""/>Pluko</div>
      {nav.map(([Icon,label,on])=><span key={label} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5',on?'bg-white/10 text-foreground':'text-muted-foreground')}><Icon className="size-3.5"/>{label}</span>)}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between"><div><p className="text-base font-semibold sm:text-lg">Overview</p><p className="text-muted-foreground">Your image search activity at a glance.</p></div><span className="rounded-full bg-white px-3 py-1 font-medium text-black">New search</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Search jobs','128'],['API requests','4.2k'],['Error rate','0.4%'],['Avg. response','38 ms']].map(([label,value])=><div key={label} className="rounded-lg border p-3"><p className="text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{value}</p></div>)}</div>
      <div className="grid flex-1 gap-3 lg:grid-cols-5">
        <div className="flex flex-col rounded-lg border p-3 lg:col-span-3"><p className="mb-3 font-medium">Provider pages, last 7 days</p><div className="relative flex flex-1 items-end gap-2 border-b border-white/10">{[25,50,75].map(line=><span key={line} className="absolute inset-x-0 border-t border-white/[0.06]" style={{bottom:`${line}%`}}/>)}{bars.map((value,index)=><span key={index} className="relative flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/50 to-indigo-300/90" style={{height:`${value*0.8}%`}}/>)}</div></div>
        <div className="hidden rounded-lg border p-3 lg:col-span-2 lg:block"><p className="mb-2 font-medium">Recent jobs</p>{[['concrete architecture','Complete','text-emerald-400'],['mountain landscapes','Running','text-indigo-300'],['product shots','Complete','text-emerald-400'],['abstract textures','Partial','text-amber-300'],['office interiors','Complete','text-emerald-400'],['wireless headphones','Complete','text-emerald-400']].map(([query,status,tone])=><div key={query} className="flex items-center justify-between border-t py-2 first:border-0"><span className="truncate">{query}</span><span className={tone}>● {status}</span></div>)}</div>
      </div>
    </div>
  </div>;
}

function Workspace(){
  const ref=useScrollProgress({start:1,end:0.6});
  return <section id="workspace" className="scroll-mt-16 px-5 pt-24 pb-32 sm:px-8 sm:pb-44">
    <div className="mx-auto max-w-[1200px]">
      <Reveal className="mx-auto max-w-3xl text-center"><Eyebrow>The workspace</Eyebrow><h2 className={site.headline}>Everything in one place.</h2><p className={cn(site.lede,'mx-auto mt-6 max-w-2xl')}>Try queries, follow jobs, read request logs and manage keys and webhooks, without writing a line of code first.</p></Reveal>
      <div ref={ref} className={cn(styles.scaleIn,'mt-16')}>
        <div className={cn(site.frame,'aspect-[16/10] overflow-hidden sm:aspect-[16/9]')}><WorkspaceMock/></div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Sample data. Your workspace shows your own projects and usage.</p>
      </div>
      <div className="mt-16 grid gap-10 sm:grid-cols-3">
        {[[Sparkles,'Playground','Try any query and watch results arrive live.'],[Layers,'Jobs and logs','Follow every job and inspect each request and response.'],[KeyRound,'Keys and webhooks','Create, rotate and revoke without a support ticket.']].map(([Icon,title,text],index)=><Reveal key={title} delay={index*70} className="text-center"><Icon className="mx-auto mb-4 size-5 text-[var(--accent-ink)]"/><h3 className="font-semibold tracking-tight">{title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p></Reveal>)}
      </div>
      <div className="mt-14 flex justify-center"><Button asChild size="lg" className="h-12 rounded-full px-7 text-base"><Link href="/app">Open the workspace<ArrowRight/></Link></Button></div>
    </div>
  </section>;
}

/* ---------- Photo band ---------- */

function PhotoBand(){
  const loop=[...ALL_PHOTOS,...ALL_PHOTOS];
  return <section className="py-28 sm:py-40">
    <Reveal className="mx-auto max-w-3xl px-5 text-center sm:px-8"><Eyebrow>Any subject</Eyebrow><h2 className={site.headline}>From concrete to mountaintops.</h2><p className={cn(site.lede,'mx-auto mt-6 max-w-2xl')}>Architecture, landscapes, products, textures. Narrow results by size, shape, colour and type, or skip the sites you don’t want.</p></Reveal>
    <div className={cn(styles.marqueeTrack,'mt-16 overflow-hidden')}>
      <ul className={styles.marquee} aria-label="Sample images and the queries that found them">
        {loop.map((photo,index)=><li key={`${photo.id}-${index}`} aria-hidden={index>=ALL_PHOTOS.length} className="group relative w-64 shrink-0 overflow-hidden rounded-3xl sm:w-80">
          <Photo photo={photo} className="aspect-[4/5] w-full transition-transform duration-700 group-hover:scale-105"/>
          <span className="absolute inset-x-3 bottom-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 justify-self-start truncate rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur"><Search className="size-3 shrink-0"/>{photo.query}</span>
        </li>)}
      </ul>
    </div>
    <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2 px-5">
      {['Size','Shape','Colour','Image type','Safe search','Minimum width','Exclude sites'].map(label=><span key={label} className="rounded-full border px-4 py-2 text-sm text-muted-foreground">{label}</span>)}
    </div>
  </section>;
}

/* ---------- Responsibility ---------- */

const PRINCIPLES=[
  [DatabaseZap,'Nothing stored','Pluko keeps metadata and logs. It never downloads or hosts image files.'],
  [Link2,'Source always attached','Every result links to the page it came from, so you can check reuse rights.'],
  [BadgeInfo,'No licence claims','Licensing is reported as unknown unless a source can prove otherwise.'],
  [EyeOff,'Fewer watermarks','Likely stock-photo sites rank lower by default, and you can exclude any site per search.'],
];

function Responsibility(){
  return <section className="border-t px-5 py-28 sm:px-8 sm:py-40">
    <div className="mx-auto grid max-w-[1200px] gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
      <Reveal className="lg:sticky lg:top-28 lg:self-start"><Eyebrow>Responsible by default</Eyebrow><h2 className={site.headline}>URLs, not copies.</h2><p className={cn(site.lede,'mt-6 max-w-md')}>Pluko points you to images on the web and tells you where they live. What you reuse, and how, stays your call.</p>
        <Link href="/privacy" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-ink)] hover:underline">How we handle data<ArrowRight className="size-4"/></Link>
      </Reveal>
      <ul className="divide-y border-y">
        {PRINCIPLES.map(([Icon,title,text],index)=><Reveal as="li" key={title} delay={index*60} className="flex gap-5 py-8">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted"><Icon className="size-5"/></span>
          <div><h3 className="text-lg font-semibold tracking-tight">{title}</h3><p className="mt-1.5 leading-relaxed text-muted-foreground">{text}</p></div>
        </Reveal>)}
      </ul>
    </div>
  </section>;
}

/* ---------- FAQ ---------- */

function Faq(){
  return <section className="bg-muted/40 px-5 py-28 sm:px-8 sm:py-40">
    <div className="mx-auto max-w-3xl">
      <Reveal className="text-center"><Eyebrow>FAQ</Eyebrow><h2 className={site.headline}>Questions, answered.</h2></Reveal>
      <Reveal delay={80} className="mt-14">
        <Accordion type="single" collapsible className="border-t">
          {faqs.map(([question,answer])=><AccordionItem key={question} value={question} className="border-b">
            <AccordionTrigger className="py-6 text-left text-lg font-medium tracking-tight hover:no-underline">{question}</AccordionTrigger>
            <AccordionContent className="pb-6 text-base leading-relaxed text-muted-foreground">{answer}</AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </Reveal>
      <p className="mt-10 text-center text-sm text-muted-foreground">Something else? <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">Get in touch</Link></p>
    </div>
  </section>;
}

/* ---------- Closing ---------- */

function Closing(){
  return <section className="relative overflow-hidden px-5 py-32 text-center sm:px-8 sm:py-48">
    <div className={site.glow} style={{inset:'20% 10% 0'}} aria-hidden/>
    <Reveal className="mx-auto max-w-3xl">
      <h2 className={site.display} style={{fontSize:'clamp(2.75rem,7vw,5.5rem)'}}>Start building.</h2>
      <p className={cn(site.lede,'mx-auto mt-6 max-w-xl')}>Create a workspace, generate a key, and run your first search in a few minutes.</p>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 rounded-full px-7 text-base"><Link href="/app?mode=register">Get started<ArrowRight/></Link></Button>
        <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base"><Link href="/contact">Talk to us</Link></Button>
      </div>
    </Reveal>
  </section>;
}

export default function LandingPage(){
  useEffect(()=>{
    // Old administrator invitations and reset links used /#accept=TOKEN.
    if(new URLSearchParams(window.location.hash.slice(1)).has('accept'))window.location.replace(`/app${window.location.hash}`);
    const root=document.documentElement;
    root.style.scrollBehavior='smooth';root.dataset.scrollBehavior='smooth';
    return()=>{root.style.scrollBehavior='';delete root.dataset.scrollBehavior;};
  },[]);
  return <PublicShell>
    <Hero/>
    <Statement/>
    <HowItWorks/>
    <div data-dark-band className={cn('dark',site.dark)}>
      <Developers/>
      <Workspace/>
    </div>
    <PhotoBand/>
    <Responsibility/>
    <Faq/>
    <Closing/>
  </PublicShell>;
}
