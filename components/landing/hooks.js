'use client';
import {useEffect,useRef,useState} from 'react';

export function usePrefersReducedMotion(){
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(media.matches);
    sync();media.addEventListener('change',sync);
    return()=>media.removeEventListener('change',sync);
  },[]);
  return reduced;
}

// True once (or while, with `once:false`) the element is on screen.
export function useInView({threshold=0.15,once=true,rootMargin='0px'}={}){
  const ref=useRef(null),[inView,setInView]=useState(false);
  useEffect(()=>{
    const node=ref.current;
    if(!node||!('IntersectionObserver' in window)){setInView(true);return;}
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setInView(true);if(once)observer.disconnect();}
      else if(!once)setInView(false);
    },{threshold,rootMargin});
    observer.observe(node);
    return()=>observer.disconnect();
  },[threshold,once,rootMargin]);
  return [ref,inView];
}

// Scroll progress of an element through the viewport, from 0 (its top reaches `start`) to 1 (its bottom reaches `end`).
// Written straight to a CSS variable on the element to avoid re-rendering on every scroll event.
export function useScrollProgress({start=0.85,end=0.35,variable='--progress',onChange}={}){
  const ref=useRef(null);
  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){node.style.setProperty(variable,'1');onChange?.(1);return;}
    let frame=0;
    const update=()=>{
      frame=0;
      const box=node.getBoundingClientRect(),view=window.innerHeight;
      const from=view*start,to=view*end-box.height;
      const value=Math.min(1,Math.max(0,(from-box.top)/Math.max(1,from-to)));
      node.style.setProperty(variable,value.toFixed(4));
      onChange?.(value);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
  },[start,end,variable,onChange]);
  return ref;
}
