'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Check,FileJson,Layers,LayoutDashboard} from 'lucide-react';
import {collections} from '@/lib/marketing/content';
import {legal} from '@/lib/legal';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';
import site from '@/components/design/design.module.css';

const PHOTOS=collections.flatMap(group=>group.photos).slice(0,6);

const POINTS=[
  {icon:FileJson,title:'URLs, not files',text:'Every result is an image URL with its source page, title and size. Pluko never downloads or stores the images.'},
  {icon:Layers,title:'One query or thousands',text:'Send a single search or a batch. Each runs as a background job you can poll, or get a signed webhook when it finishes.'},
  {icon:LayoutDashboard,title:'A workspace to watch it',text:'Create projects and keys, try queries in a playground, and see every request your app makes.'},
];

function WaitlistForm(){
  const [address,setAddress]=useState(''),[state,setState]=useState('idle'),[message,setMessage]=useState('');
  const submit=async event=>{
    event.preventDefault();
    const website=new FormData(event.currentTarget).get('website')||'';
    setState('sending');setMessage('');
    try{
      const response=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:address,website})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error?.message||'Something went wrong. Try again.');
      setState('done');setMessage('You’re on the list. We’ll email you when Pluko opens.');setAddress('');
    }catch(failure){setState('error');setMessage(failure.message);}
  };
  return <form onSubmit={submit} className="mx-auto mt-10 grid w-full max-w-md gap-3" noValidate={false}>
    <div className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="waitlist-email" className="sr-only">Email address</label>
      <Input id="waitlist-email" type="email" required maxLength={254} autoComplete="email" placeholder="you@company.com" value={address} onChange={event=>setAddress(event.target.value)} className="h-12 w-full rounded-full px-5 text-base sm:flex-1"/>
      {/* Left empty by people; bots that fill every field are ignored. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0"/>
      <Button type="submit" size="lg" className="h-12 rounded-full px-7 text-base" disabled={state==='sending'}>
        {state==='sending'?<><Spinner/>Adding…</>:state==='done'?<><Check/>Added</>:'Notify me'}
      </Button>
    </div>
    <p role="status" aria-live="polite" className={cn('min-h-5 text-sm',state==='error'?'text-destructive':'text-muted-foreground')}>
      {message||<>We’ll only use your email to tell you when Pluko opens. <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy policy</Link>.</>}
    </p>
  </form>;
}

function Photo({photo}){
  const [failed,setFailed]=useState(false);
  if(failed)return <span role="img" aria-label={photo.title} className="block aspect-[4/5] w-full rounded-2xl bg-muted"/>;
  return <img src={photo.url} alt={photo.title} width="320" height="400" loading="lazy" decoding="async" onError={()=>setFailed(true)} className="aspect-[4/5] w-full rounded-2xl bg-muted object-cover"/>;
}

export default function ComingSoon(){
  useEffect(()=>{
    // Public pages are light, even after a visit to the dark workspace.
    const root=document.documentElement;
    root.classList.remove('dark');root.classList.add('light');
  },[]);

  return <div className={site.page}>
    <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" aria-label="Pluko home" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><img src="/logo.svg" width="26" height="26" alt=""/>Pluko</Link>
      <Badge variant="outline" className="rounded-full px-3 py-1 font-normal text-muted-foreground"><span className="size-1.5 rounded-full bg-[var(--accent-ink)]" aria-hidden/>Coming soon</Badge>
    </header>

    <main id="main">
      <section className="px-5 pt-16 pb-20 text-center sm:px-8 sm:pt-24 sm:pb-28">
        <p className={cn(site.rise,'mb-6 font-mono text-sm text-[var(--accent-ink)]')}>Image search API · launching soon</p>
        <h1 className={cn(site.display,site.rise)} style={{'--delay':'60ms'}}>Every image.<br/>One API.</h1>
        <p className={cn(site.lede,site.rise,'mx-auto mt-7 max-w-2xl')} style={{'--delay':'120ms'}}>
          Pluko lets your backend search the web for images and get back URLs, source links and metadata your product can use. We’re putting on the finishing touches. Leave your email and we’ll tell you the day it opens.
        </p>
        <div className={site.rise} style={{'--delay':'180ms'}}><WaitlistForm/></div>
      </section>

      <section aria-label="Example images" className="px-5 sm:px-8">
        <div className="mx-auto grid max-w-[1100px] grid-cols-3 gap-3 sm:grid-cols-6">
          {PHOTOS.map((photo,index)=><div key={photo.id} className={cn(index>2&&'hidden sm:block',index%2===1&&'sm:translate-y-6')}><Photo photo={photo}/></div>)}
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1100px]">
          <h2 className={cn(site.headline,'mx-auto max-w-3xl text-center')}>What you’ll get.</h2>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-3xl border bg-border md:grid-cols-3">
            {POINTS.map(point=><li key={point.title} className="grid content-start gap-3 bg-background p-7 sm:p-8">
              <point.icon className="size-5 text-[var(--accent-ink)]" aria-hidden/>
              <h3 className="text-lg font-semibold tracking-[-0.02em]">{point.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{point.text}</p>
            </li>)}
          </ul>
        </div>
      </section>
    </main>

    <footer className="border-t">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Pluko · Built by <a href="https://pstack.in" target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-foreground hover:underline">{legal.operator}<ArrowUpRight className="size-3"/></a></span>
        <nav aria-label="Legal" className="flex gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link></nav>
      </div>
      <p className="mx-auto max-w-[1200px] px-5 pb-8 text-xs text-muted-foreground sm:px-8">Sample photography from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">Unsplash</a>, shown for illustration.</p>
    </footer>
  </div>;
}
