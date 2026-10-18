'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';
import {timeAgo} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Tooltip,TooltipContent,TooltipTrigger} from '@/components/ui/tooltip';

// One refresh scope per screen. Every loader on the screen (useResource, useListQuery, or a custom
// loader passed to useRefreshable) registers here, so a single button or the R key reloads the whole page.
// Actions are stable and live in their own context, so loaders don't re-render when the status changes.
export const REFRESH_EVENT='pluko:refresh';
const ActionsContext=createContext(null);
const StatusContext=createContext(null);

export function RefreshScope({children}){
  const loaders=useRef(new Set());
  const busy=useRef(false);
  const [count,setCount]=useState(0),[refreshing,setRefreshing]=useState(false),[updated,setUpdated]=useState(null);

  const register=useCallback(load=>{
    loaders.current.add(load);setCount(loaders.current.size);
    return()=>{loaders.current.delete(load);setCount(loaders.current.size);};
  },[]);
  const markUpdated=useCallback(()=>setUpdated(Date.now()),[]);

  const refresh=useCallback(async()=>{
    if(busy.current||!loaders.current.size)return;
    busy.current=true;setRefreshing(true);
    // Loaders keep showing their current data and filters; `manual` makes them report failures here.
    const results=await Promise.allSettled([...loaders.current].map(load=>load({quiet:true,manual:true})));
    busy.current=false;setRefreshing(false);
    const failed=results.find(result=>result.status==='rejected');
    if(failed)toast.error(failed.reason?.message||'Couldn’t refresh this page. Showing the last loaded data.');
    else setUpdated(Date.now());
  },[]);

  useEffect(()=>{
    const onRefresh=()=>refresh();
    window.addEventListener(REFRESH_EVENT,onRefresh);
    return()=>window.removeEventListener(REFRESH_EVENT,onRefresh);
  },[refresh]);

  const actions=useMemo(()=>({register,refresh,markUpdated}),[register,refresh,markUpdated]);
  const status=useMemo(()=>({count,refreshing,updated}),[count,refreshing,updated]);
  return <ActionsContext.Provider value={actions}><StatusContext.Provider value={status}>{children}</StatusContext.Provider></ActionsContext.Provider>;
}

/** {register, refresh, markUpdated} for the current page, or null outside a scope. */
export const useRefreshScope=()=>useContext(ActionsContext);

/** Registers a loader with the page's refresh scope. `load({quiet,manual})` should throw when manual and it fails. */
export function useRefreshable(load,enabled=true){
  const actions=useContext(ActionsContext);
  const latest=useRef(load);
  useEffect(()=>{latest.current=load;});
  const register=actions?.register;
  useEffect(()=>{
    if(!register||!enabled)return;
    return register(options=>latest.current(options));
  },[register,enabled]);
  return actions;
}

// "Updated 12s ago", ticking while the page is open.
function UpdatedLabel({at}){
  const [,tick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>tick(n=>n+1),5000);return()=>clearInterval(timer);},[]);
  if(!at)return null;
  const recent=Date.now()-at<10000;
  return <span className="hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums md:inline">Updated {recent?'just now':timeAgo(at)}</span>;
}

/** Reloads everything on the current page. Renders nothing outside a refresh scope or when nothing has registered. */
export function RefreshButton({className}){
  const actions=useContext(ActionsContext),status=useContext(StatusContext);
  if(!actions||!status?.count)return null;
  return <span className={cn('flex items-center gap-2',className)}>
    <UpdatedLabel at={status.updated}/>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Refresh this page" disabled={status.refreshing} onClick={actions.refresh}>
          <RefreshCw className={cn(status.refreshing&&'animate-spin')}/>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Refresh <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">R</kbd></TooltipContent>
    </Tooltip>
  </span>;
}
