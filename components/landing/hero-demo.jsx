'use client';
import {useEffect,useState} from 'react';
import {Check,ImageIcon,Search} from 'lucide-react';
import {collections} from '@/lib/marketing/content';
import {cn} from '@/lib/utils';
import {useInView,usePrefersReducedMotion} from './hooks';
import styles from './landing.module.css';

const TYPE_MS=45,SEARCH_MS=700,TILE_MS=110,HOLD_MS=4200;

function Photo({photo,eager,className}){
  const [failed,setFailed]=useState(false);
  if(failed)return <span role="img" aria-label={photo.title} className={cn('flex items-center justify-center bg-muted text-muted-foreground',className)}><ImageIcon className="size-5"/></span>;
  return <img src={photo.url} alt={photo.title} width="480" height="360" loading={eager?'eager':'lazy'} decoding="async" onError={()=>setFailed(true)} className={cn('bg-muted object-cover',className)}/>;
}

// A self-running playground: type a query, "search", reveal results, then move to the next sample collection.
export function HeroDemo(){
  const reduced=usePrefersReducedMotion();
  const [ref,visible]=useInView({threshold:0.1,once:false});
  const [index,setIndex]=useState(0),[typed,setTyped]=useState(''),[phase,setPhase]=useState('typing'),[shown,setShown]=useState(0),[selected,setSelected]=useState(0);
  const group=collections[index],photos=group.photos;
  const static_=reduced;

  useEffect(()=>{
    if(static_){setTyped(group.query);setPhase('done');setShown(photos.length);return;}
    if(!visible)return;
    let timer;
    if(phase==='typing'){
      if(typed.length<group.query.length)timer=setTimeout(()=>setTyped(group.query.slice(0,typed.length+1)),TYPE_MS);
      else timer=setTimeout(()=>setPhase('searching'),250);
    }else if(phase==='searching')timer=setTimeout(()=>{setPhase('results');setShown(0);},SEARCH_MS);
    else if(phase==='results'){
      if(shown<photos.length)timer=setTimeout(()=>setShown(count=>count+1),TILE_MS);
      else timer=setTimeout(()=>setPhase('done'),200);
    }else if(phase==='done')timer=setTimeout(()=>{setIndex(current=>(current+1)%collections.length);setTyped('');setShown(0);setSelected(0);setPhase('typing');},HOLD_MS);
    return()=>clearTimeout(timer);
  },[static_,visible,phase,typed,shown,group.query,photos.length]);

  const active=photos[selected];
  const progress=phase==='typing'||phase==='searching'?0:Math.round((shown/photos.length)*100);
  return <div ref={ref} className={cn(styles.frame,'overflow-hidden text-left')}>
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-[#ff5f57]"/><span className="size-2.5 rounded-full bg-[#febc2e]"/><span className="size-2.5 rounded-full bg-[#28c840]"/></span>
      <span className="text-xs font-medium text-muted-foreground">Playground</span>
      <span className="ml-auto rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Sample results</span>
    </div>
    <div className="grid lg:grid-cols-[1fr_19rem]">
      <div className="grid min-w-0 gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
          <Search className="size-4 shrink-0 text-muted-foreground"/>
          <span className="sr-only">Example query: {group.query}</span>
          <span aria-hidden className="min-w-0 flex-1 truncate font-medium">{typed}{phase==='typing'&&<span className={styles.caret}/>}</span>
          <span aria-hidden className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',phase==='searching'?'bg-[var(--accent-ink)] text-white':'bg-muted text-muted-foreground')}>{phase==='searching'?'Searching…':'Search'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
          <span className="font-mono">job_7f3a…</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--accent-ink)] transition-[width] duration-300" style={{width:`${progress}%`}}/></span>
          <span className="tabular-nums">{phase==='typing'||phase==='searching'?'queued':`${shown} of ${photos.length} found`}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {photos.map((photo,position)=>{
            const on=position<shown;
            return <button key={`${index}-${photo.id}`} type="button" onClick={()=>setSelected(position)} aria-label={`Show details for ${photo.title}`} aria-pressed={selected===position}
              className={cn('relative aspect-[4/3] overflow-hidden rounded-xl outline-offset-2 transition-[opacity,box-shadow]',on?styles.tileIn:'opacity-0',selected===position&&on&&'ring-2 ring-[var(--accent-ink)] ring-offset-2 ring-offset-background')}
              tabIndex={on?0:-1}>
              <Photo photo={photo} eager={index===0&&position<3} className="size-full"/>
              {selected===position&&on&&<span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-black shadow"><Check className="size-3"/></span>}
            </button>;
          })}
        </div>
      </div>
      <div className="hidden border-l bg-muted/30 p-5 lg:block" aria-live="polite">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Selected result</p>
        <pre className="code-block !p-0 !pr-0 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-foreground/80">{`{
  "title": "${active.title}",
  "image_url": "https://images.unsplash.com/…",
  "source_domain": "unsplash.com",
  "query": "${group.query}",
  "license_status": "unknown"
}`}</pre>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Illustrative sample. Real results come from the live source with their own URLs and dimensions.</p>
      </div>
    </div>
  </div>;
}
