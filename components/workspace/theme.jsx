'use client';
import {useCallback,useEffect,useState} from 'react';
import {THEME_KEY as KEY} from '@/lib/theme-script';

export const THEMES=['system','light','dark'];

function read(){
  try{const value=localStorage.getItem(KEY);return THEMES.includes(value)?value:'system';}
  catch{return 'system';}
}
function resolve(choice){
  if(choice!=='system')return choice;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark';
}
function apply(choice){
  const mode=resolve(choice),root=document.documentElement;
  root.classList.toggle('dark',mode==='dark');
  root.classList.toggle('light',mode==='light');
}


// Workspace theme preference. Public pages are always light, so leaving the workspace restores it.
export function useWorkspaceTheme(){
  const [theme,setThemeState]=useState('system');
  useEffect(()=>{
    const choice=read();setThemeState(choice);apply(choice);
    const media=window.matchMedia?.('(prefers-color-scheme: light)');
    const onChange=()=>{if(read()==='system')apply('system');};
    media?.addEventListener?.('change',onChange);
    return()=>{
      media?.removeEventListener?.('change',onChange);
      const root=document.documentElement;root.classList.remove('dark');root.classList.add('light');
    };
  },[]);
  const setTheme=useCallback(choice=>{
    try{localStorage.setItem(KEY,choice);}catch{}
    setThemeState(choice);apply(choice);
  },[]);
  return [theme,setTheme];
}
