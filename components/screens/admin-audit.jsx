'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {History,RefreshCw,Search} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CodeBlock,DescriptionList,EmptyState,IdPill,LoadMore,PageHeader,SearchInput,TableToolbar,ErrorState,TableSkeleton} from '@/components/workspace/ui';
import {format} from '@/lib/display';
import {matches} from '@/lib/ui-helpers';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';

const parseDetails=value=>{if(!value)return null;try{const parsed=JSON.parse(value);return parsed&&typeof parsed==='object'&&!Object.keys(parsed).length?null:parsed;}catch{return value;}};
const area=action=>String(action||'').split('.')[0];

// Each area of the product gets its own colour, like the method badges in the docs.
const AREA_TONES={login:'bg-sky-500/12 text-sky-700 dark:text-sky-300',key:'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',project:'bg-violet-500/12 text-violet-700 dark:text-violet-300',user:'bg-amber-500/14 text-amber-700 dark:text-amber-300',invite:'bg-amber-500/14 text-amber-700 dark:text-amber-300',settings:'bg-rose-500/12 text-rose-700 dark:text-rose-300',rule:'bg-rose-500/12 text-rose-700 dark:text-rose-300',mfa:'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'};
function AreaBadge({action}){
  const name=area(action);
  return <span className={cn('inline-flex w-20 shrink-0 justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold capitalize',AREA_TONES[name]||'bg-muted text-muted-foreground')}>{name||'event'}</span>;
}

export function AdminAudit(){
  const {call}=useWorkspace();
  const [rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState(null),[query,setQuery]=useState(''),[kind,setKind]=useState('all'),[selected,setSelected]=useState(null);
  const load=useCallback(async before=>{
    if(before)setLoadingMore(true);else setLoading(true);
    try{const data=await call(`/api/admin/audit${before?`?before=${before}`:''}`);setRows(old=>before?old.concat(data.audit):data.audit);setCursor(data.next_cursor);setError(null);}
    catch(failure){setError(failure);}
    finally{setLoading(false);setLoadingMore(false);}
  },[call]);
  useEffect(()=>{load();},[load]);
  const areas=useMemo(()=>[...new Set(rows.map(row=>area(row.action)))].sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(row=>(kind==='all'||area(row.action)===kind)&&matches(row,query,['action','target','details','actor'])),[rows,kind,query]);
  const details=selected&&parseDetails(selected.details);

  // Events grouped under a heading per day, newest first.
  const days=useMemo(()=>{
    const groups=new Map();
    for(const row of filtered){const day=new Date(row.created).toDateString();if(!groups.has(day))groups.set(day,[]);groups.get(day).push(row);}
    return [...groups.entries()];
  },[filtered]);
  const dayLabel=day=>{const today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();return day===today?'Today':day===yesterday?'Yesterday':new Date(day).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});};
  const empty=query||kind!=='all'?<EmptyState icon={Search} title="No matching events" description="Only loaded events are filtered. Load older activity to search further back."/>:<EmptyState icon={History} title="No activity yet" description="Administrator and account actions will be recorded here."/>;

  return <>
    <PageHeader title="Audit history" description="Every change to users, keys, quotas, rules, retention, provider availability, jobs and backups, with who did it and when."/>
    <div className="grid gap-4">
      <TableToolbar end={<Button type="button" variant="outline" size="sm" className="rounded-full" disabled={loading} onClick={()=>load()}><RefreshCw className={loading?'animate-spin':undefined}/>Refresh</Button>}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search events, subjects…"/>
        <Select value={kind} onValueChange={setKind}><SelectTrigger size="sm" className="h-9 w-40 rounded-xl capitalize" aria-label="Filter by area"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All areas</SelectItem>{areas.map(value=><SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select>
      </TableToolbar>
      {error&&!rows.length?<ErrorState error={error} onRetry={()=>load()} title="Couldn’t load audit history"/>
      :loading&&!rows.length?<TableSkeleton rows={8} columns={3}/>
      :!filtered.length?empty
      :<div className="grid gap-6">
        {days.map(([day,events])=><section key={day} aria-label={dayLabel(day)}>
          <h2 className="mb-2 px-1 text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">{dayLabel(day)}</h2>
          <ol className="overflow-hidden rounded-2xl border bg-card">
            {events.map(row=><li key={row.id} className="border-b last:border-0">
              <button type="button" onClick={()=>setSelected(row)} aria-pressed={selected?.id===row.id} className={cn('grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none',selected?.id===row.id&&'bg-muted/60')}>
                <AreaBadge action={row.action}/>
                <span className="min-w-0"><code className="block truncate font-mono text-[13px]">{row.action}</code><span className="block truncate font-mono text-xs text-muted-foreground" title={row.target||''}>{row.target||'—'}</span></span>
                <span className="text-xs text-muted-foreground">{new Date(row.created).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              </button>
            </li>)}
          </ol>
        </section>)}
      </div>}
      {cursor&&<LoadMore loading={loadingMore} onClick={()=>load(cursor)}>Load earlier activity</LoadMore>}
    </div>
    <Sheet open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>
      <SheetContent className="!w-full overflow-y-auto sm:!max-w-lg" onOpenAutoFocus={event=>event.preventDefault()}>
        <SheetHeader className="border-b"><SheetTitle className="font-mono text-sm">{selected?.action}</SheetTitle><SheetDescription>{selected&&format(selected.created)}</SheetDescription></SheetHeader>
        {selected&&<div className="grid min-w-0 gap-5 p-4">
          <DescriptionList className="sm:grid-cols-[7rem_minmax(0,1fr)]" items={[['Event ID',<span key="i" className="font-mono text-xs">#{selected.id}</span>],['Actor',selected.actor?<IdPill key="a" value={selected.actor} length={22}/>:'System'],['Subject',selected.target?<IdPill key="t" value={selected.target} length={22}/>:'—'],['Time',format(selected.created)]]}/>
          {details?<CodeBlock title="Details" language="json" code={typeof details==='string'?details:JSON.stringify(details,null,2)}/>:<p className="text-sm text-muted-foreground">No extra details were recorded.</p>}
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
