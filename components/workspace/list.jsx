'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,ListFilter,PlusCircle,SearchX,X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {DATE_PRESETS,PAGE_SIZES,activeFilterCount,apiParams,describeDateRange,emptyState,pageWindow,rangeLabel,readState,writeState} from '@/lib/list-query';
import {useWorkspace} from '@/components/workspace/context';
import {useRefreshScope,useRefreshable} from '@/components/workspace/refresh';
import {EmptyState,SearchInput,TableToolbar} from '@/components/workspace/ui';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';

const SEARCH_DELAY=300;
const isSet=value=>Array.isArray(value)?value.length>0:Boolean(value);

/**
 * A server-paginated, filterable, sortable list.
 * `filters` must be stable between renders (a module constant or useMemo), or the list reloads on every render.
 * `fixed` parameters are always sent (e.g. {user_id} on a user's detail page) and never shown as filters.
 * The state lives in the URL (unless syncUrl is false), so a filtered view can be shared or bookmarked.
 */
export function useListQuery(endpoint,{id=endpoint,itemsKey='items',filters:definitions=[],defaults={},fixed={},syncUrl=true,prefix='',enabled=true,poll=0}={}){
  const {call}=useWorkspace();
  const markUpdated=useRefreshScope()?.markUpdated;
  const storageKey=`pluko.pageSize.${id}`;
  const [state,setState]=useState(()=>{
    const search=syncUrl&&typeof window!=='undefined'?window.location.search:'';
    let initial=search?readState(search,definitions,defaults,prefix):emptyState(defaults);
    if(!new URLSearchParams(search).has(prefix+'page_size')){
      try{const saved=Number(window.localStorage.getItem(storageKey));if(PAGE_SIZES.includes(saved))initial={...initial,pageSize:saved};}catch{}
    }
    return initial;
  });
  const [search,setSearch]=useState(state.q);
  const [data,setData]=useState(null),[loading,setLoading]=useState(enabled),[error,setError]=useState(null);
  const ticket=useRef(0);

  // Typing waits a moment before searching, then goes back to page 1.
  useEffect(()=>{
    if(search===state.q)return;
    const timer=setTimeout(()=>setState(old=>({...old,q:search,page:1})),SEARCH_DELAY);
    return()=>clearTimeout(timer);
  },[search,state.q]);

  const stateKey=JSON.stringify(state),fixedKey=JSON.stringify(fixed);
  // Built at request time, so "last 24 hours" moves forward on every refresh.
  const buildQuery=useCallback(()=>apiParams(JSON.parse(stateKey),definitions,JSON.parse(fixedKey)).toString(),[stateKey,fixedKey,definitions]);

  const load=useCallback(async({quiet=false,manual=false}={})=>{
    if(!enabled)return;
    const n=++ticket.current;
    if(!quiet)setLoading(true);
    try{
      const result=await call(`${endpoint}?${buildQuery()}`);
      if(n===ticket.current){setData(result);setError(null);markUpdated?.();}
      return result;
    }catch(failure){
      if(n===ticket.current&&!quiet)setError(failure);
      if(manual)throw failure;
    }finally{
      if(n===ticket.current&&!quiet)setLoading(false);
    }
  },[call,endpoint,enabled,buildQuery,markUpdated]);

  useEffect(()=>{load();},[load]);
  useRefreshable(load,enabled);
  useEffect(()=>{
    if(!poll||!enabled)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load({quiet:true});},poll);
    return()=>clearInterval(timer);
  },[poll,load,enabled]);

  // Keep the URL in step without adding history entries for every filter change.
  useEffect(()=>{
    if(!syncUrl)return;
    const next=writeState(window.location.search,JSON.parse(stateKey),definitions,defaults,prefix);
    if(next!==window.location.search)window.history.replaceState(window.history.state,'',window.location.pathname+next+window.location.hash);
  },[syncUrl,stateKey,definitions,defaults,prefix]);

  // If rows were removed and the current page is now past the end, step back to the last page.
  const total=data?.total??0,pageSize=data?.page_size??state.pageSize;
  useEffect(()=>{
    if(!data||!total)return;
    const pages=Math.ceil(total/pageSize);
    if(state.page>pages)setState(old=>({...old,page:pages}));
  },[data,total,pageSize,state.page]);

  const setFilter=useCallback((name,value)=>setState(old=>({...old,page:1,filters:{...old.filters,[name]:value}})),[]);
  const clearFilters=useCallback(()=>{setSearch('');setState(old=>({...old,q:'',page:1,filters:{...(defaults.filters||{})}}));},[defaults.filters]);
  const setSort=useCallback(sort=>setState(old=>({...old,sort,page:1})),[]);
  const setPage=useCallback(page=>setState(old=>({...old,page})),[]);
  const setPageSize=useCallback(size=>{
    try{window.localStorage.setItem(storageKey,String(size));}catch{}
    setState(old=>({...old,pageSize:size,page:1}));
  },[storageKey]);

  const activeCount=activeFilterCount(state,definitions);
  return {
    items:data?.[itemsKey],data,total,loading,error,reload:load,
    search,setSearch,state,filters:state.filters,setFilter,clearFilters,definitions,activeCount,
    isFiltered:activeCount>0||Boolean(state.q.trim()),
    sort:state.sort,setSort,page:state.page,pageSize:state.pageSize,setPage,setPageSize,
  };
}

/* ---------- filter controls ---------- */

function summary(def,value){
  if(def.type==='date')return describeDateRange(value);
  const label=key=>def.options?.find(([option])=>String(option)===String(key))?.[1]??key;
  if(Array.isArray(value))return value.length>2?`${value.length} selected`:value.map(label).join(', ');
  return label(value);
}

function MultiOptions({def,value=[],onChange}){
  const toggle=option=>onChange(value.includes(option)?value.filter(item=>item!==option):[...value,option]);
  return <div className="grid gap-0.5" role="group" aria-label={def.label}>
    {def.options.map(([option,label])=>{
      const id=`f-${def.id}-${option}`;
      return <Label key={option} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 font-normal hover:bg-muted">
        <Checkbox id={id} checked={value.includes(String(option))} onCheckedChange={()=>toggle(String(option))}/>{label}
      </Label>;
    })}
  </div>;
}

function SelectOptions({def,value,onChange}){
  return <div className="grid gap-0.5" role="radiogroup" aria-label={def.label}>
    {[['',def.anyLabel||'Any'],...def.options].map(([option,label])=>{
      const selected=String(value||'')===String(option);
      return <button key={option||'any'} type="button" role="radio" aria-checked={selected} onClick={()=>onChange(String(option))}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
        <Check className={cn('size-4',selected?'opacity-100':'opacity-0')}/>{label}
      </button>;
    })}
  </div>;
}

function DateOptions({def,value,onChange}){
  const custom=/^(\d{4}-\d{2}-\d{2})?\.\.(\d{4}-\d{2}-\d{2})?$/.exec(value||'');
  const [from,setFrom]=useState(custom?.[1]||''),[to,setTo]=useState(custom?.[2]||'');
  const invalid=from&&to&&from>to;
  return <div className="grid gap-3">
    <div className="grid gap-0.5" role="radiogroup" aria-label={`${def.label} presets`}>
      {DATE_PRESETS.map(([preset,label])=><button key={preset} type="button" role="radio" aria-checked={value===preset} onClick={()=>onChange(preset)}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
        <Check className={cn('size-4',value===preset?'opacity-100':'opacity-0')}/>{label}
      </button>)}
    </div>
    <Separator/>
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">Custom range</p>
      <div className="grid grid-cols-2 gap-2">
        <Label className="grid gap-1 text-xs font-normal text-muted-foreground">From<Input type="date" value={from} max={to||undefined} onChange={event=>setFrom(event.target.value)} className="h-8"/></Label>
        <Label className="grid gap-1 text-xs font-normal text-muted-foreground">To<Input type="date" value={to} min={from||undefined} onChange={event=>setTo(event.target.value)} className="h-8"/></Label>
      </div>
      {invalid&&<p className="text-xs text-destructive">The start date must be before the end date.</p>}
      <Button type="button" size="sm" variant="secondary" disabled={(!from&&!to)||invalid} onClick={()=>onChange(`${from}..${to}`)}>Apply range</Button>
    </div>
  </div>;
}

function FilterOptions({def,value,onChange}){
  if(def.type==='multi')return <MultiOptions def={def} value={value} onChange={onChange}/>;
  if(def.type==='date')return <DateOptions def={def} value={value} onChange={onChange}/>;
  return <SelectOptions def={def} value={value} onChange={onChange}/>;
}

function FilterButton({def,value,onChange}){
  const [open,setOpen]=useState(false);
  const set=isSet(value);
  // Single choices close the menu; multi-select stays open so several boxes can be ticked.
  const change=next=>{onChange(next);if(def.type!=='multi')setOpen(false);};
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="sm" className={cn('h-9 rounded-xl',!set&&'border-dashed')}>
        <PlusCircle className={cn(set&&'hidden')}/>{def.label}
        {set&&<><Separator orientation="vertical" className="mx-0.5 h-4"/><span className="max-w-40 truncate font-normal text-muted-foreground">{summary(def,value)}</span></>}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-2">
      <FilterOptions def={def} value={value} onChange={change}/>
      {set&&<><Separator className="my-2"/><Button type="button" variant="ghost" size="sm" className="w-full" onClick={()=>change(def.type==='multi'?[]:'')}>Clear {def.label.toLowerCase()}</Button></>}
    </PopoverContent>
  </Popover>;
}

/** Search, filter menus (a sheet on phones), removable chips for active filters, and "Clear all". */
export function FilterBar({list,placeholder='Search…',children,end}){
  const {definitions,filters,setFilter,clearFilters,activeCount,isFiltered}=list;
  return <div className="grid gap-2">
    <TableToolbar end={end}>
      <SearchInput value={list.search} onChange={list.setSearch} placeholder={placeholder}/>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {definitions.map(def=><FilterButton key={def.id} def={def} value={filters[def.id]} onChange={value=>setFilter(def.id,value)}/>)}
      </div>
      {definitions.length>0&&<Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl sm:hidden"><ListFilter/>Filters{activeCount>0&&<Badge variant="secondary" className="ml-1 rounded-full px-1.5">{activeCount}</Badge>}</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
          <SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription>Narrow down this list.</SheetDescription></SheetHeader>
          <div className="grid gap-5 px-4">
            {definitions.map(def=><section key={def.id} className="grid gap-2"><h3 className="text-sm font-medium">{def.label}</h3><FilterOptions def={def} value={filters[def.id]} onChange={value=>setFilter(def.id,value)}/></section>)}
          </div>
          <SheetFooter>{activeCount>0&&<Button type="button" variant="outline" onClick={clearFilters}>Clear all filters</Button>}</SheetFooter>
        </SheetContent>
      </Sheet>}
      {children}
    </TableToolbar>
    {isFiltered&&<div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {definitions.filter(def=>isSet(filters[def.id])).map(def=><Badge key={def.id} variant="secondary" className="h-7 gap-1 rounded-full pr-1 pl-2.5 font-normal">
        <span className="text-muted-foreground">{def.label}:</span><span className="max-w-48 truncate">{summary(def,filters[def.id])}</span>
        <button type="button" aria-label={`Remove ${def.label} filter`} onClick={()=>setFilter(def.id,def.type==='multi'?[]:'')} className="rounded-full p-0.5 hover:bg-background"><X className="size-3"/></button>
      </Badge>)}
      {list.state.q.trim()&&<Badge variant="secondary" className="h-7 gap-1 rounded-full pr-1 pl-2.5 font-normal"><span className="text-muted-foreground">Search:</span><span className="max-w-48 truncate">“{list.state.q.trim()}”</span>
        <button type="button" aria-label="Clear search" onClick={()=>list.setSearch('')} className="rounded-full p-0.5 hover:bg-background"><X className="size-3"/></button></Badge>}
      <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-2.5 text-muted-foreground" onClick={clearFilters}>Clear all</Button>
    </div>}
  </div>;
}

/* ---------- pagination ---------- */

/** "26–50 of 1,284", rows per page, and numbered pages (previous/next only on phones). */
export function Pagination({list,label='results'}){
  const {total,page,pageSize,setPage,setPageSize,loading}=list;
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(!list.data)return null;
  return <nav aria-label="Pagination" className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">{total?rangeLabel(page,pageSize,total):`No ${label}`}</p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {total>PAGE_SIZES[0]&&<label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Rows per page</span>
        <Select value={String(pageSize)} onValueChange={value=>setPageSize(Number(value))}>
          <SelectTrigger size="sm" className="w-20" aria-label="Rows per page"><SelectValue/></SelectTrigger>
          <SelectContent>{PAGE_SIZES.map(size=><SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
        </Select>
      </label>}
      {pages>1&&<div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Previous page" disabled={page<=1||loading} onClick={()=>setPage(page-1)}><ChevronLeft/></Button>
        <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">Page {page} of {pages}</span>
        <span className="hidden items-center gap-1 sm:flex">
          {pageWindow(page,pages).map((n,i)=>n==='…'
            ?<span key={'gap'+i} className="w-8 text-center text-sm text-muted-foreground" aria-hidden>…</span>
            :<Button key={n} type="button" size="icon" variant={n===page?'default':'ghost'} className="size-8 tabular-nums" aria-label={`Page ${n}`} aria-current={n===page?'page':undefined} disabled={loading&&n!==page} onClick={()=>setPage(n)}>{n}</Button>)}
        </span>
        <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Next page" disabled={page>=pages||loading} onClick={()=>setPage(page+1)}><ChevronRight/></Button>
      </div>}
    </div>
  </nav>;
}

/** Empty state that tells "nothing yet" apart from "nothing matches these filters". */
export function ListEmpty({list,icon,title,description,action}){
  if(list.isFiltered)return <EmptyState icon={SearchX} title="Nothing matches these filters" description="Try removing a filter or searching for something else."
    action={<Button type="button" variant="outline" onClick={list.clearFilters}>Clear filters</Button>}/>;
  return <EmptyState icon={icon} title={title} description={description} action={action}/>;
}
