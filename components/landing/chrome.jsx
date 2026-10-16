'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Menu} from 'lucide-react';
import {legal} from '@/lib/legal';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import styles from './landing.module.css';

const NAV=[['#how-it-works','How it works'],['#developers','Developers'],['#workspace','Workspace'],['/docs','Docs']];

export function Logo({className}){
  return <Link href="/" aria-label="Pluko home" className={cn('flex items-center gap-2 text-[17px] font-semibold tracking-tight',className)}>
    <img src="/logo.svg" width="26" height="26" alt=""/>Pluko
  </Link>;
}

export function LandingHeader(){
  const [scrolled,setScrolled]=useState(false),[onDark,setOnDark]=useState(false),[open,setOpen]=useState(false);
  useEffect(()=>{
    // Like Apple's nav, the bar turns dark while it sits over a dark band of the page.
    const onScroll=()=>{
      setScrolled(window.scrollY>12);
      const band=document.querySelector('[data-dark-band]')?.getBoundingClientRect();
      setOnDark(Boolean(band&&band.top<=32&&band.bottom>=32));
    };
    onScroll();window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);
  return <header className={cn('fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',onDark&&`dark ${styles.dark} !bg-black/70 text-foreground`,scrolled?'border-b border-black/[0.06] bg-background/75 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10':'border-b border-transparent')}>
    <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-5 sm:px-8">
      <Logo/>
      <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
        {NAV.map(([href,label])=><Link key={href} href={href} className="transition-colors hover:text-foreground">{label}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex"><Link href="/app">Sign in</Link></Button>
        <Button asChild className="rounded-full px-4"><Link href="/app?mode=register">Get started</Link></Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Open menu"><Menu/></Button></SheetTrigger>
          <SheetContent side="top" className="px-2 pb-8">
            <SheetHeader><SheetTitle className="text-left"><Logo/></SheetTitle></SheetHeader>
            <nav aria-label="Mobile" className="grid px-4">
              {[...NAV,['/status','System status'],['/contact','Contact'],['/app','Sign in']].map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="flex items-center justify-between border-b py-4 text-2xl font-semibold tracking-tight">{label}<ArrowRight className="size-5 text-muted-foreground"/></Link>)}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>;
}

const FOOTER=[
  ['Product',[['#how-it-works','How it works'],['#workspace','Workspace'],['/app','Sign in'],['/app?mode=register','Create an account']]],
  ['Developers',[['/docs','Documentation'],['/v1/openapi.json','OpenAPI schema'],['/limits','Limits'],['/status','System status']]],
  ['Company',[['/contact','Contact'],[legal.website,legal.operator]]],
  ['Legal',[['/privacy','Privacy Policy'],['/terms','Terms of Service']]],
];

export function LandingFooter(){
  return <footer className="border-t">
    <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div className="grid content-start gap-3"><Logo/><p className="max-w-xs text-sm text-muted-foreground">Image search for the products you build.</p></div>
      {FOOTER.map(([heading,links])=><nav key={heading} aria-label={heading} className="grid content-start gap-3 text-sm">
        <p className="font-medium">{heading}</p>
        {links.map(([href,label])=>{
          const external=/^https?:/.test(href)||href.startsWith('/v1/');
          return external?<a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">{label}<ArrowUpRight className="size-3"/></a>
            :<Link key={href} href={href} className="text-muted-foreground transition-colors hover:text-foreground">{label}</Link>;
        })}
      </nav>)}
    </div>
    <div className="mx-auto flex max-w-[1200px] flex-col gap-2 border-t px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-8">
      <span>© {new Date().getFullYear()} Pluko · Operated by {legal.operator}</span>
      <span>Sample photography from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">Unsplash</a>, shown for illustration.</span>
    </div>
  </footer>;
}
