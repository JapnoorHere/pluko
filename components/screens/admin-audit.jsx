'use client';
import {useEffect,useMemo,useState} from 'react';
import {History} from 'lucide-react';
import Link from 'next/link';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {CodeBlock,DescriptionList,IdPill,PageHeader,ErrorState,TableSkeleton} from '@/components/workspace/ui';
import {format} from '@/lib/display';
import {cn} from '@/lib/utils';
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

const DEFAULTS={sort:'created_desc'};
const dayLabel=day=>{const today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();return day===today?'Today':day===yesterday?'Yesterday':new Date(day).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});};

/**
 * Audit events grouped by day, with filters and pages. `fixed` locks hidden filters, e.g. {user} on a user's page
 * (events done by or to that account). `compact` hides the filters for short previews.
 */
export function AuditList({fixed={},compact=false,pageSize}){
  const {href}=useWorkspace();
  const [selected,setSelected]=useState(null);
  const areas=useResource('/api/admin/audit/areas');
  const filters=useMemo(()=>[
    {id:'area',label:'Area',type:'multi',options:(areas.data?.areas||[]).map(value=>[value,value.charAt(0).toUpperCase()+value.slice(1).replace(/_/g,' ')])},
    {id:'created',label:'When',type:'date'},
  ],[areas.data]);
  const list=useListQuery('/api/admin/audit',{id:compact?'audit-preview':'audit',itemsKey:'audit',filters,defaults:DEFAULTS,fixed,syncUrl:!compact});
  const {setPageSize}=list;
  useEffect(()=>{if(pageSize)setPageSize(pageSize);},[pageSize,setPageSize]);
  const rows=list.items;
  const details=selected&&parseDetails(selected.details);

  // Events grouped under a heading per day, in the chosen order.
  const days=useMemo(()=>{
    const groups=new Map();
    for(const row of rows||[]){const day=new Date(row.created).toDateString();if(!groups.has(day))groups.set(day,[]);groups.get(day).push(row);}
    return [...groups.entries()];
  },[rows]);

  return <>
    <div className="grid gap-4">
      {!compact&&<FilterBar list={list} placeholder="Search actions, subjects or details…" end={
        <Select value={list.sort} onValueChange={list.setSort}><SelectTrigger size="sm" className="w-36" aria-label="Order"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="created_desc">Newest first</SelectItem><SelectItem value="created_asc">Oldest first</SelectItem></SelectContent></Select>}/>}
      {list.error&&!rows?.length?<ErrorState error={list.error} onRetry={()=>list.reload()} title="Couldn’t load audit history"/>
      :!rows?<TableSkeleton rows={compact?4:8} columns={3}/>
      :!rows.length?<ListEmpty list={list} icon={History} title="No activity yet" description={fixed.user?'Nothing has been recorded for this account yet.':'Administrator and account actions will be recorded here.'}/>
      :<div className={cn('grid gap-6',list.loading&&'opacity-60 transition-opacity')}>
        {days.map(([day,events])=><section key={day} aria-label={dayLabel(day)}>
          <h2 className="mb-2 px-1 text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">{dayLabel(day)}</h2>
          <ol className="overflow-hidden rounded-2xl border bg-card">
            {events.map(row=><li key={row.id} className="border-b last:border-0">
              <button type="button" onClick={()=>setSelected(row)} aria-pressed={selected?.id===row.id} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none">
                <AreaBadge action={row.action}/>
                <span className="min-w-0"><code className="block truncate font-mono text-[13px]">{row.action}</code><span className="block truncate text-xs text-muted-foreground" title={row.target||''}>{row.actor_email?`by ${row.actor_email}`:row.actor?`by ${row.actor}`:'System'}{row.target?<span className="font-mono"> · {row.target}</span>:null}</span></span>
                <span className="text-xs text-muted-foreground">{new Date(row.created).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              </button>
            </li>)}
          </ol>
        </section>)}
      </div>}
      {!compact&&<Pagination list={list} label="events"/>}
    </div>
    <Sheet open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>
      <SheetContent className="!w-full overflow-y-auto sm:!max-w-lg" onOpenAutoFocus={event=>event.preventDefault()}>
        <SheetHeader className="border-b"><SheetTitle className="font-mono text-sm">{selected?.action}</SheetTitle><SheetDescription>{selected&&format(selected.created)}</SheetDescription></SheetHeader>
        {selected&&<div className="grid min-w-0 gap-5 p-4">
          <DescriptionList className="sm:grid-cols-[7rem_minmax(0,1fr)]" items={[
            ['Event ID',<span key="i" className="font-mono text-xs">#{selected.id}</span>],
            ['Actor',selected.actor_email?<Link key="a" href={href('users',selected.actor)} className="hover:underline">{selected.actor_email}</Link>:selected.actor?<IdPill key="a" value={selected.actor} length={22}/>:'System'],
            ['Subject',selected.target?<IdPill key="t" value={selected.target} length={22}/>:'—'],
            ['Time',format(selected.created)],
          ]}/>
          {details?<CodeBlock title="Details" language="json" code={typeof details==='string'?details:JSON.stringify(details,null,2)}/>:<p className="text-sm text-muted-foreground">No extra details were recorded.</p>}
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}

export function AdminAudit(){
  return <>
    <PageHeader title="Audit history" description="Every change to users, keys, quotas, rules, retention, provider availability, jobs and backups, with who did it and when."/>
    <AuditList/>
  </>;
}
