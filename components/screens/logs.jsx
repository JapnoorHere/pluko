'use client';
import {useCallback,useEffect,useState} from 'react';
import {ClipboardList,RefreshCw,Search} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CodeBlock,DataTable,DescriptionList,Duration,EmptyState,ErrorState,IdPill,LoadMore,PageHeader,SearchInput,Shimmer,TableToolbar,TimeAgo,ToneBadge} from '@/components/workspace/ui';
import {format} from '@/lib/display';
import {httpTone} from '@/lib/ui-helpers';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';

const STATUS=[['all','All statuses'],['200','200 OK'],['201','201 Created'],['202','202 Accepted'],['400','400 Bad request'],['401','401 Unauthorized'],['403','403 Forbidden'],['404','404 Not found'],['409','409 Conflict'],['429','429 Rate limited'],['500','500 Server error']];

function StatusCode({status}){
  return <ToneBadge tone={httpTone(status)} className="font-mono normal-case">{status||'Interrupted'}</ToneBadge>;
}

function LogSheet({id,onClose}){
  const {call}=useWorkspace();
  const [log,setLog]=useState(null),[error,setError]=useState(null);
  useEffect(()=>{
    if(!id)return;
    setLog(null);setError(null);
    call(`/api/logs/${id}`).then(data=>setLog(data.log)).catch(setError);
  },[id,call]);
  return <Sheet open={Boolean(id)} onOpenChange={open=>{if(!open)onClose();}}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      <SheetHeader className="border-b">
        <SheetTitle className="flex flex-wrap items-center gap-2 font-mono text-sm">{log?<><Badge variant="outline">{log.method}</Badge><span className="break-all">{log.path}</span></>:'Request'}</SheetTitle>
        <SheetDescription>{log?<span className="flex flex-wrap items-center gap-3"><StatusCode status={log.status}/><Duration ms={log.duration}/><span>{format(log.created)}</span></span>:'Loading request details…'}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 p-4">
        {error?<ErrorState error={error}/>
        :!log?<div className="grid gap-3"><Shimmer className="h-8 w-48"/><Shimmer className="h-48"/></div>
        :<Tabs defaultValue="request">
          <TabsList><TabsTrigger value="request">Request</TabsTrigger><TabsTrigger value="response">Response</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
          <TabsContent value="request" className="pt-3">{log.payload?<CodeBlock title="Request body" language="json" maxHeight="60vh" code={JSON.stringify(log.payload,null,2)}/>:<p className="text-sm text-muted-foreground">{log.method==="GET"?"GET requests don’t have a body.":"No request body is stored. Bodies are redacted after the retention period."}</p>}</TabsContent>
          <TabsContent value="response" className="pt-3">{log.response?<CodeBlock title="Response body" language="json" maxHeight="60vh" code={JSON.stringify(log.response,null,2)}/>:<p className="text-sm text-muted-foreground">No response body was stored.</p>}</TabsContent>
          <TabsContent value="details" className="pt-3"><DescriptionList items={[['Request ID',<IdPill key="id" value={log.id} length={28}/>],['Project',log.project_id?<IdPill key="p" value={log.project_id} length={28}/>:'—'],['API key',log.key_id?<IdPill key="k" value={log.key_id} length={28}/>:'Dashboard session'],['Status',<StatusCode key="s" status={log.status}/>],['Duration',<Duration key="d" ms={log.duration}/>],['Time',format(log.created)]]}/></TabsContent>
        </Tabs>}
      </div>
    </SheetContent>
  </Sheet>;
}

export function Logs(){
  const {call}=useWorkspace();
  const [logs,setLogs]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState(null),[selected,setSelected]=useState(null),[cursor,setCursor]=useState(null);
  const load=useCallback(async before=>{
    if(before)setLoadingMore(true);else setLoading(true);
    try{
      const params=new URLSearchParams();
      if(query.trim())params.set('q',query.trim());
      if(status!=='all')params.set('status',status);
      if(before)params.set('before',before);
      const data=await call(`/api/logs?${params}`);
      setLogs(old=>before?old.concat(data.logs):data.logs);setCursor(data.next_cursor);setError(null);
    }catch(failure){setError(failure);}
    finally{setLoading(false);setLoadingMore(false);}
  },[call,query,status]);
  useEffect(()=>{const timer=setTimeout(()=>load(),250);return()=>clearTimeout(timer);},[load]);

  const columns=[
    {key:'status',header:'Status',cell:row=><StatusCode status={row.status}/>},
    {key:'route',header:'Request',className:'max-w-0 w-full',cell:row=><div className="flex min-w-0 items-center gap-2"><Badge variant="outline" className="shrink-0 font-mono text-[11px]">{row.method}</Badge><span className="truncate font-mono text-xs">{row.path}</span></div>},
    {key:'duration',header:'Duration',headClassName:'hidden sm:table-cell text-right',className:'hidden sm:table-cell text-right',cell:row=><Duration ms={row.duration}/>},
    {key:'created',header:'Time',headClassName:'text-right',className:'text-right text-muted-foreground',cell:row=><TimeAgo value={row.created}/>},
  ];
  const filtered=query||status!=='all';
  return <>
    <PageHeader title="Request logs" description="Every dashboard and API request, with sanitized request and response bodies. Secrets are never stored."/>
    <DataTable columns={columns} rows={logs} loading={loading} error={error} onRetry={()=>load()} onRowClick={row=>setSelected(row.id)} selectedKey={selected} skeletonRows={8} caption="Request logs"
      toolbar={<TableToolbar end={<Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=>load()}><RefreshCw className={loading?'animate-spin':undefined}/>Refresh</Button>}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search routes or bodies…" className="sm:w-72"/>
        <Select value={status} onValueChange={setStatus}><SelectTrigger size="sm" className="w-40" aria-label="Filter by status"><SelectValue/></SelectTrigger><SelectContent>{STATUS.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        {filtered&&<Button type="button" variant="ghost" size="sm" onClick={()=>{setQuery('');setStatus('all');}}>Clear</Button>}
      </TableToolbar>}
      empty={filtered?<EmptyState icon={Search} title="No matching requests" description="Try a different search or status." action={<Button variant="outline" onClick={()=>{setQuery('');setStatus('all');}}>Clear filters</Button>}/>
        :<EmptyState icon={ClipboardList} title="No requests yet" description="Requests from the dashboard and your API keys appear here as they happen."/>}
      footer={cursor&&<LoadMore loading={loadingMore} onClick={()=>load(cursor)}>Load older requests</LoadMore>}/>
    <LogSheet id={selected} onClose={()=>setSelected(null)}/>
  </>;
}
