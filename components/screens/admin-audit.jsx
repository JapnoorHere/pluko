'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {History,RefreshCw,Search} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CodeBlock,DataTable,DescriptionList,EmptyState,IdPill,LoadMore,PageHeader,SearchInput,TableToolbar,TimeAgo} from '@/components/workspace/ui';
import {format} from '@/lib/display';
import {matches} from '@/lib/ui-helpers';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';

const parseDetails=value=>{if(!value)return null;try{return JSON.parse(value);}catch{return value;}};
const area=action=>String(action||'').split('.')[0];

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

  const columns=[
    {key:'action',header:'Event',cell:row=><Badge variant="outline" className="font-mono text-[11px]">{row.action}</Badge>},
    {key:'target',header:'Subject',className:'max-w-0 w-full',cell:row=><span className="block truncate font-mono text-xs text-muted-foreground" title={row.target||''}>{row.target||'—'}</span>},
    {key:'created',header:'When',headClassName:'text-right',className:'text-right text-muted-foreground',cell:row=><TimeAgo value={row.created}/>},
  ];
  return <>
    <PageHeader title="Audit history" description="Every change to users, keys, quotas, rules, retention, provider availability, jobs and backups, with who did it and when."/>
    <DataTable columns={columns} rows={filtered} loading={loading} error={error} onRetry={()=>load()} onRowClick={setSelected} selectedKey={selected?.id} skeletonRows={8} caption="Audit history"
      toolbar={<TableToolbar end={<Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=>load()}><RefreshCw className={loading?'animate-spin':undefined}/>Refresh</Button>}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search events, subjects…"/>
        <Select value={kind} onValueChange={setKind}><SelectTrigger size="sm" className="w-40 capitalize" aria-label="Filter by area"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All areas</SelectItem>{areas.map(value=><SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select>
      </TableToolbar>}
      empty={query||kind!=='all'?<EmptyState icon={Search} title="No matching events" description="Only loaded events are filtered. Load older activity to search further back."/>:<EmptyState icon={History} title="No activity yet" description="Administrator and account actions will be recorded here."/>}
      footer={cursor&&<LoadMore loading={loadingMore} onClick={()=>load(cursor)}>Load earlier activity</LoadMore>}/>
    <Sheet open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" onOpenAutoFocus={event=>event.preventDefault()}>
        <SheetHeader className="border-b"><SheetTitle className="font-mono text-sm">{selected?.action}</SheetTitle><SheetDescription>{selected&&format(selected.created)}</SheetDescription></SheetHeader>
        {selected&&<div className="grid gap-5 p-4">
          <DescriptionList className="sm:grid-cols-[7rem_1fr]" items={[['Event ID',<span key="i" className="font-mono text-xs">#{selected.id}</span>],['Actor',selected.actor?<IdPill key="a" value={selected.actor} length={24}/>:'System'],['Subject',selected.target?<IdPill key="t" value={selected.target} length={24}/>:'—'],['Time',format(selected.created)]]}/>
          {details?<CodeBlock title="Details" language="json" code={typeof details==='string'?details:JSON.stringify(details,null,2)}/>:<p className="text-sm text-muted-foreground">No extra details were recorded.</p>}
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}
