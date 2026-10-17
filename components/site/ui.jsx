'use client';
import {useEffect} from 'react';
import {cn} from '@/lib/utils';
import {LandingFooter,LandingHeader} from './chrome';
import site from '@/components/design/design.module.css';

export * from '@/components/design/system';

/* ---------- Shell ---------- */

// Every public page: light theme, the shared header and footer, and a skip link.
export function PublicShell({children,className}){
  useEffect(()=>{
    // A client navigation from the workspace can arrive with the dark class still set.
    const root=document.documentElement;
    root.classList.remove('dark');root.classList.add('light');
  },[]);
  return <div className={cn(site.page,className)}>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">Skip to content</a>
    <LandingHeader/>
    <main id="main">{children}</main>
    <LandingFooter/>
  </div>;
}
