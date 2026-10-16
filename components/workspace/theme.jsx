'use client';
import {useCallback,useEffect,useState} from 'react';

const KEY='pluko-theme';
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

// Runs before first paint on workspace pages so a light-theme user never sees a dark flash.
export const THEME_SCRIPT=`try{var t=localStorage.getItem('${KEY}')||'system';var m=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.classList.toggle('light',m==='light');}catch(e){}`;

export function ThemeScript(){
  return <script dangerouslySetInnerHTML={{__html:THEME_SCRIPT}}/>;
}

// Workspace theme preference. The public site is always dark, so leaving the workspace restores it.
export function useWorkspaceTheme(){
  const [theme,setThemeState]=useState('system');
  useEffect(()=>{
    const choice=read();setThemeState(choice);apply(choice);
    const media=window.matchMedia?.('(prefers-color-scheme: light)');
    const onChange=()=>{if(read()==='system')apply('system');};
    media?.addEventListener?.('change',onChange);
    return()=>{
      media?.removeEventListener?.('change',onChange);
      const root=document.documentElement;root.classList.remove('light');root.classList.add('dark');
    };
  },[]);
  const setTheme=useCallback(choice=>{
    try{localStorage.setItem(KEY,choice);}catch{}
    setThemeState(choice);apply(choice);
  },[]);
  return [theme,setTheme];
}
