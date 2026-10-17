'use client';
import {useEffect,useState} from 'react';
import {Toaster} from '@/components/ui/sonner';

// Follows the light/dark class on <html>, which the workspace theme switch changes.
export function ThemedToaster(){
  const [theme,setTheme]=useState('light');
  useEffect(()=>{
    const root=document.documentElement;
    const sync=()=>setTheme(root.classList.contains('dark')?'dark':'light');
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(root,{attributes:true,attributeFilter:['class']});
    return()=>observer.disconnect();
  },[]);
  return <Toaster theme={theme} richColors closeButton position="bottom-right"/>;
}
