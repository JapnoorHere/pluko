'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useRefreshable,useRefreshScope} from '@/components/workspace/refresh';

export const WorkspaceContext=createContext(null);

// Everything a screen needs: the signed-in user, the API caller, and URL navigation.
export function useWorkspace(){
  const value=useContext(WorkspaceContext);
  if(!value)throw new Error('useWorkspace must be used inside the workspace');
  return value;
}

// Loads one GET endpoint and keeps loading, error and reload state together.
// `poll` refreshes in the background without showing the loading state again.
export function useResource(path,{poll=0,enabled=true}={}){
  const {call}=useWorkspace();
  const [data,setData]=useState(),[error,setError]=useState(null),[loading,setLoading]=useState(Boolean(path&&enabled));
  const latest=useRef(0);
  const markUpdated=useRefreshScope()?.markUpdated;
  const load=useCallback(async({quiet=false,manual=false}={})=>{
    if(!path||!enabled)return;
    const ticket=++latest.current;
    if(!quiet)setLoading(true);
    try{
      const result=await call(path);
      if(ticket===latest.current){setData(result);setError(null);markUpdated?.();}
      return result;
    }catch(failure){
      if(ticket===latest.current&&!quiet)setError(failure);
      if(manual)throw failure;
    }finally{
      if(ticket===latest.current&&!quiet)setLoading(false);
    }
  },[call,path,enabled,markUpdated]);
  useEffect(()=>{load();},[load]);
  useRefreshable(load,Boolean(path&&enabled));
  useEffect(()=>{
    if(!poll||!enabled)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load({quiet:true});},poll);
    return()=>clearInterval(timer);
  },[poll,load,enabled]);
  return {data,error,loading,reload:load,setData};
}

// Wraps an async action with a busy flag. Errors are re-thrown so dialogs can show them inline.
export function useAction(action){
  const [busy,setBusy]=useState(false);
  const run=useCallback(async(...args)=>{
    setBusy(true);
    try{return await action(...args);}
    finally{setBusy(false);}
  },[action]);
  return [run,busy];
}
