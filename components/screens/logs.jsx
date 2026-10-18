'use client';
import {useEffect,useMemo,useState} from 'react';
import {ClipboardList} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import Link from 'next/link';
import {useOwnedOptions} from '@/components/screens/jobs';
import {ExportButton,FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {CodeBlock,DataTable,DescriptionList,Duration,ErrorState,IdPill,PageHeader,Shimmer,TimeAgo,ToneBadge,MethodBadge} from '@/components/workspace/ui';
import {format,isoTime} from '@/lib/display';
import {httpTone} from '@/lib/ui-helpers';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';

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
    <SheetContent className="!w-full overflow-y-auto sm:!max-w-2xl">
      <SheetHeader className="border-b">
        <SheetTitle className="flex flex-wrap items-center gap-2 font-mono text-sm">{log?<><MethodBadge method={log.method}/><span className="break-all">{log.path}</span></>:'Request'}</SheetTitle>
        <SheetDescription>{log?<span className="flex flex-wrap items-center gap-3"><StatusCode status={log.status}/><Duration ms={log.duration}/><span>{format(log.created)}</span></span>:'Loading request details…'}</SheetDescription>
      </SheetHeader>
      <div className="grid min-w-0 gap-4 p-4">
        {error?<ErrorState error={error}/>
        :!log?<div className="grid gap-3"><Shimmer className="h-8 w-48"/><Shimmer className="h-48"/></div>
        :<Tabs defaultValue="request" className="min-w-0">
          <TabsList><TabsTrigger value="request">Request</TabsTrigger><TabsTrigger value="response">Response</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
          <TabsContent value="request" className="min-w-0 pt-3">{log.payload?<CodeBlock title="Request body" language="json" maxHeight="60vh" code={JSON.stringify(log.payload,null,2)}/>:<p className="text-sm text-muted-foreground">{log.method==="GET"?"GET requests don’t have a body.":"No request body is stored. Bodies are redacted after the retention period."}</p>}</TabsContent>
          <TabsContent value="response" className="min-w-0 pt-3">{log.response?<CodeBlock title="Response body" language="json" maxHeight="60vh" code={JSON.stringify(log.response,null,2)}/>:<p className="text-sm text-muted-foreground">No response body was stored.</p>}</TabsContent>
          <TabsContent value="details" className="min-w-0 pt-3"><DescriptionList className="sm:grid-cols-[7rem_minmax(0,1fr)]" items={[['Request ID',<IdPill key="id" value={log.id} length={22}/>],['Project',log.project_id?<IdPill key="p" value={log.project_id} length={22}/>:'—'],['API key',log.key_id?<IdPill key="k" value={log.key_id} length={22}/>:'Dashboard session'],['Status',<StatusCode key="s" status={log.status}/>],['Duration',<Duration key="d" ms={log.duration}/>],['Time',format(log.created)]]}/></TabsContent>
        </Tabs>}
      </div>
    </SheetContent>
  </Sheet>;
}

const STATUS_OPTIONS=[['2xx','2xx Success'],['4xx','4xx Client errors'],['5xx','5xx Server errors'],['400','400 Bad request'],['401','401 Unauthorized'],['403','403 Forbidden'],['404','404 Not found'],['409','409 Conflict'],['429','429 Rate limited'],['500','500 Server error'],['503','503 Unavailable']];
const ENDPOINT_OPTIONS=[['search','Image search'],['jobs','Jobs'],['results','Results'],['usage','Usage'],['feedback','Feedback']];
const DEFAULTS={sort:'created_desc'};
const LOG_CSV=[['request_id',r=>r.id],['method',r=>r.method],['path',r=>r.path],['status',r=>r.status],['duration_ms',r=>r.duration],['project',r=>r.project_name],['account',r=>r.user_email||''],['created_at',r=>isoTime(r.created)]];

/** The request log table with its filters, pages and detail panel. `fixed` locks hidden filters such as {user_id}. */
export function LogsList({fixed={},showAccount=false,onSourceChange}){
  const {me,href}=useWorkspace();
  const admin=me.role==='admin';
  const [selected,setSelected]=useState(null);
  const {projects,keys}=useOwnedOptions(fixed.user_id);
  const filters=useMemo(()=>[
    {id:'source',label:'Source',type:'select',anyLabel:'API requests only',options:[['all','Everything, incl. dashboard']]},
    {id:'status',label:'Status',type:'multi',options:STATUS_OPTIONS},
    {id:'endpoint',label:'Endpoint',type:'multi',options:ENDPOINT_OPTIONS},
    {id:'method',label:'Method',type:'multi',options:[['GET','GET'],['POST','POST']]},
    {id:'project_id',label:'Project',type:'select',anyLabel:'Any project',options:projects.map(p=>[p.id,admin&&!fixed.user_id?`${p.name} · ${p.owner}`:p.name])},
    {id:'key_id',label:'API key',type:'select',anyLabel:'Any key',options:keys.map(k=>[k.id,`${k.name} · ${k.project}`])},
    {id:'speed',label:'Duration',type:'select',anyLabel:'Any duration',options:[['slow','Slower than 1 s'],['very_slow','Slower than 5 s']]},
    {id:'created',label:'Time',type:'date'},
  ],[projects,keys,admin,fixed.user_id]);
  const list=useListQuery('/api/logs',{id:'logs',itemsKey:'logs',filters,defaults:DEFAULTS,fixed});
  const everything=list.filters.source==='all';
  useEffect(()=>{onSourceChange?.(everything);},[everything,onSourceChange]);

  const columns=[
    {key:'status',header:'Status',cell:row=><StatusCode status={row.status}/>},
    {key:'route',header:'Request',className:'max-w-0 w-full',cell:row=><div className="flex min-w-0 items-center gap-2"><MethodBadge method={row.method}/><span className="truncate font-mono text-xs">{row.path}</span></div>},
    ...(showAccount?[{key:'account',header:'Account',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell max-w-44 truncate',cell:row=>row.user_id?<Link href={href('users',row.user_id)} onClick={event=>event.stopPropagation()} className="text-muted-foreground hover:text-foreground hover:underline">{row.user_email}</Link>:<span className="text-muted-foreground">—</span>}]:[]),
    {key:'project',header:'Project',headClassName:'hidden xl:table-cell',className:'hidden xl:table-cell max-w-36 truncate text-muted-foreground',cell:row=>row.project_name||'—'},
    {key:'duration',header:'Duration',sortKey:'duration',headClassName:'hidden sm:table-cell text-right',className:'hidden sm:table-cell text-right',cell:row=><Duration ms={row.duration}/>},
    {key:'created',header:'Time',sortKey:'created',headClassName:'text-right',className:'text-right text-muted-foreground whitespace-nowrap',cell:row=><TimeAgo value={row.created}/>},
  ];
  return <>
    <DataTable columns={columns} rows={list.items} loading={list.loading} error={list.error} onRetry={()=>list.reload()} onRowClick={row=>setSelected(row.id)} selectedKey={selected} skeletonRows={8} caption="Request logs"
      sort={list.sort} onSort={list.setSort}
      toolbar={<FilterBar list={list} placeholder="Search paths, IDs or bodies…" end={<ExportButton list={list} filename="pluko-requests" columns={LOG_CSV}/>}/>}
      empty={<ListEmpty list={list} icon={ClipboardList} title={everything?'No requests yet':'No API requests yet'} description={fixed.user_id?'This account hasn’t made any matching requests.':everything?'Requests from the dashboard and your API keys appear here as they happen.':'Calls made with your API keys appear here as they happen. Create a key under API keys and call POST /v1/images/search from your backend.'}/>}
      footer={<Pagination list={list} label="requests"/>}/>
    <LogSheet id={selected} onClose={()=>setSelected(null)}/>
  </>;
}

export function Logs(){
  const {me}=useWorkspace();
  const [everything,setEverything]=useState(false);
  return <>
    <PageHeader title="Request logs" description={everything?'Everything: API calls from your applications plus this dashboard’s own requests. Secrets are never stored.':'Calls your applications make to the Pluko API with your API keys, with sanitized request and response bodies. Secrets are never stored.'}/>
    <LogsList showAccount={me.role==='admin'} onSourceChange={setEverything}/>
  </>;
}
