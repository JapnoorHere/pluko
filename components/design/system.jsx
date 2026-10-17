'use client';
// The shared design system: type, frames, code, callouts, tables and contents.
// Used by the public site and the signed-in workspace so both look like one product.
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AlertTriangle,Check,Copy,Info,Lightbulb,Link2} from 'lucide-react';
import {cn} from '@/lib/utils';
import site from './design.module.css';

export function Reveal({children,className,delay=0,as:Tag='div',...props}){
  const ref=useRef(null);
  useEffect(()=>{
    const node=ref.current;
    if(!node||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    node.dataset.animate='true';
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){node.dataset.visible='true';observer.disconnect();}},{threshold:0.12});
    observer.observe(node);
    return()=>observer.disconnect();
  },[]);
  return <Tag ref={ref} className={cn(site.reveal,className)} style={{'--delay':`${delay}ms`}} {...props}>{children}</Tag>;
}

export function Eyebrow({children,className}){
  return <p className={cn('mb-4 text-sm font-medium text-[var(--accent-ink)]',className)}>{children}</p>;
}

// The top of every inner page: label, big headline, one line, optional actions or extras.
export function PageHero({eyebrow,title,children,actions,align='center',className}){
  const centered=align==='center';
  return <section className={cn('relative px-5 pt-36 pb-16 sm:px-8 sm:pt-44 sm:pb-20',className)}>
    <div className={cn('mx-auto max-w-[1200px]',centered&&'text-center')}>
      {eyebrow&&<Reveal><Eyebrow>{eyebrow}</Eyebrow></Reveal>}
      <Reveal delay={60}><h1 className={cn(site.title,centered&&'mx-auto max-w-4xl')}>{title}</h1></Reveal>
      {children&&<Reveal delay={120}><div className={cn(site.lede,'mt-6 max-w-2xl',centered&&'mx-auto')}>{children}</div></Reveal>}
      {actions&&<Reveal delay={180} className={cn('mt-9 flex flex-col gap-3 sm:flex-row',centered&&'items-center justify-center')}>{actions}</Reveal>}
    </div>
  </section>;
}

/* ---------- Reading ---------- */

export function Prose({children,className}){
  return <div className={cn(site.prose,className)}>{children}</div>;
}

// A section heading with a hover link that copies the section's address.
export function Heading({id,level=2,children,className}){
  const Tag=`h${level}`;
  const [copied,setCopied]=useState(false);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),1500);return()=>clearTimeout(timer);},[copied]);
  const copy=async event=>{
    event.preventDefault();
    const url=`${window.location.origin}${window.location.pathname}#${id}`;
    window.history.replaceState(null,'',`#${id}`);
    try{await navigator.clipboard.writeText(url);setCopied(true);}catch{}
  };
  return <Tag id={id} className={cn(site.anchor,'group flex items-center gap-2 font-semibold tracking-tight text-foreground',level===2?'text-[clamp(1.75rem,3vw,2.25rem)] leading-tight tracking-[-0.035em]':'text-xl',className)}>
    {children}
    <a href={`#${id}`} onClick={copy} aria-label={`Copy link to ${typeof children==='string'?children:'this section'}`} className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted">
      {copied?<Check className="size-4"/>:<Link2 className="size-4"/>}
    </a>
  </Tag>;
}

const CALLOUTS={note:[Info,'Note','border-sky-500/25 bg-sky-500/[0.06] [&_svg]:text-sky-600'],tip:[Lightbulb,'Tip','border-emerald-500/25 bg-emerald-500/[0.06] [&_svg]:text-emerald-600'],warning:[AlertTriangle,'Important','border-amber-500/30 bg-amber-500/[0.07] [&_svg]:text-amber-600']};
export function Callout({type='note',title,children}){
  const [Icon,label,tone]=CALLOUTS[type];
  return <div role="note" className={cn('flex gap-3 rounded-2xl border p-4 text-[15px] leading-relaxed',tone)}>
    <Icon className="mt-0.5 size-[18px] shrink-0"/>
    <div className="min-w-0"><p className="font-semibold text-foreground">{title||label}</p><div className="mt-1 text-foreground/75 [&_a]:text-[var(--accent-ink)] [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.86em]">{children}</div></div>
  </div>;
}

/* ---------- Code ---------- */

const LANGUAGE_KEY='pluko-docs-language';
const LanguageContext=createContext(null);

// One language choice for every code sample on a page, remembered in this browser.
export function LanguageProvider({children,languages=['cURL','JavaScript','Python']}){
  const [language,setLanguageState]=useState(languages[0]);
  useEffect(()=>{try{const saved=localStorage.getItem(LANGUAGE_KEY);if(languages.includes(saved))setLanguageState(saved);}catch{}},[languages]);
  const setLanguage=useCallback(value=>{setLanguageState(value);try{localStorage.setItem(LANGUAGE_KEY,value);}catch{}},[]);
  return <LanguageContext.Provider value={{language,setLanguage,languages}}>{children}</LanguageContext.Provider>;
}

function CopyCode({code,label='Copy code'}){
  const [copied,setCopied]=useState(false);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),1500);return()=>clearTimeout(timer);},[copied]);
  return <button type="button" aria-label={label} onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{}}} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white">
    {copied?<Check className="size-3.5"/>:<Copy className="size-3.5"/>}{copied?'Copied':'Copy'}
  </button>;
}

// A dark code window. Pass `code` for one sample, or `samples` ({cURL: '...', JavaScript: '...'}) for tabs.
export function CodeBlock({code,samples,title,language,className,maxHeight='28rem'}){
  const context=useContext(LanguageContext);
  const options=samples?Object.keys(samples):null;
  const active=options?(options.includes(context?.language)?context.language:options[0]):null;
  const text=samples?samples[active]:code;
  return <div className={cn('dark overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d] text-[13px] text-white/85 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)]',className)}>
    <div className="flex min-h-10 items-center gap-2 border-b border-white/10 px-2 pl-4">
      {title&&<span className="truncate font-mono text-xs text-white/55">{title}</span>}
      {options&&options.length>1&&<div role="tablist" aria-label="Language" className={cn('flex gap-0.5',title&&'ml-2')}>
        {options.map(option=><button key={option} type="button" role="tab" aria-selected={option===active} onClick={()=>context?.setLanguage(option)} className={cn('rounded-md px-2 py-1 text-xs transition-colors',option===active?'bg-white/10 text-white':'text-white/50 hover:text-white')}>{option}</button>)}
      </div>}
      {!title&&!options&&language&&<span className="font-mono text-xs text-white/45">{language}</span>}
      <span className="ml-auto"><CopyCode code={text}/></span>
    </div>
    <pre className="code-block font-mono leading-relaxed" style={{maxHeight}}>{text}</pre>
  </div>;
}

/* ---------- Tables ---------- */

export function SimpleTable({columns,rows,className}){
  return <div className={cn('overflow-x-auto rounded-2xl border',className)}>
    <table className="w-full min-w-[32rem] text-left text-[15px]">
      <thead className="bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase"><tr>{columns.map(column=><th key={column} scope="col" className="px-4 py-3 font-medium">{column}</th>)}</tr></thead>
      <tbody className="divide-y">{rows.map((row,index)=><tr key={index} className="align-top">{row.map((cell,cellIndex)=><td key={cellIndex} className={cn('px-4 py-3.5',cellIndex===0?'font-medium text-foreground':'text-foreground/75')}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

/* ---------- Contents with scroll-spy ---------- */

// The id of the section currently at the top of the reading area.
export function useActiveSection(ids){
  const [active,setActive]=useState(ids[0]);
  useEffect(()=>{
    if(!('IntersectionObserver' in window))return;
    const visible=new Map();
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>visible.set(entry.target.id,entry.isIntersecting));
      const first=ids.find(id=>visible.get(id));
      if(first)setActive(first);
      // Above the first section (back at the top of the page), highlight the first item again.
      else if((document.getElementById(ids[0])?.getBoundingClientRect().top??0)>90)setActive(ids[0]);
    },{rootMargin:'-90px 0px -65% 0px'});
    ids.forEach(id=>{const node=document.getElementById(id);if(node)observer.observe(node);});
    return()=>observer.disconnect();
  },[ids]);
  return active;
}

export function Contents({items,title='On this page',className}){
  const active=useActiveSection(items.map(([id])=>id));
  return <nav aria-label={title} className={cn('text-sm',className)}>
    <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
    <ul className="grid gap-1 border-l">
      {items.map(([id,label])=><li key={id}><a href={`#${id}`} aria-current={active===id?'location':undefined} className={cn('-ml-px block border-l py-1 pl-4 transition-colors',active===id?'border-foreground font-medium text-foreground':'border-transparent text-muted-foreground hover:text-foreground')}>{label}</a></li>)}
    </ul>
  </nav>;
}

export function BackToTop(){
  const [shown,setShown]=useState(false);
  useEffect(()=>{const onScroll=()=>setShown(window.scrollY>1200);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
  return <button type="button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top" className={cn('fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full border bg-background/90 shadow-lg backdrop-blur transition-all',shown?'translate-y-0 opacity-100':'pointer-events-none translate-y-3 opacity-0')}>
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>;
}

/* ---------- Article layout ---------- */

// Contents on the left (sticky on desktop), reading column on the right.
export function ArticleLayout({contents,title='On this page',children,aside}){
  return <div className="mx-auto max-w-[1200px] gap-16 px-5 pb-28 sm:px-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
    <aside className="hidden lg:block"><div className="sticky top-28 grid gap-8"><Contents items={contents} title={title}/>{aside}</div></aside>
    <div className="min-w-0 max-w-3xl">{children}</div>
  </div>;
}

export function ArticleSection({id,title,children}){
  return <section className="border-t pt-14 pb-6 first:border-t-0 first:pt-0"><Heading id={id}>{title}</Heading><div className="mt-6 grid gap-6">{children}</div></section>;
}

export function PrintButton({children='Print'}){
  return <button type="button" onClick={()=>window.print()} className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:bg-muted print:hidden">
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M6 14h12v7H6z"/></svg>{children}
  </button>;
}
