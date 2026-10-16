'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Copy,ExternalLink,RefreshCw,Repeat2,Search,Sparkles} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {DataTable,EmptyState,IdPill,LoadMore,PageHeader,RowActions,SearchInput,StatusBadge,TableToolbar,TimeAgo,copyWithToast,toast} from '@/components/workspace/ui';
import {matches,percent} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const STATUSES=[['all','All'],['running','Running'],['queued','Queued'],['complete','Complete'],['partial','Partial'],['cancelled','Cancelled']];

export function Jobs(){
  const {call,navigate,href}=useWorkspace();
  const [jobs,setJobs]=useState([]),[status,setStatus]=useState('all'),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState(null),[query,setQuery]=useState('');
  const load=useCallback(async({before,quiet=false}={})=>{
    if(before)setLoadingMore(true);else if(!quiet)setLoading(true);
    try{
      const params=new URLSearchParams({limit:'25'});
      if(status!=='all')params.set('status',status);
      if(before)params.set('before',before);
      const data=await call(`/api/jobs?${params}`);
      if(quiet){
        // Merge fresh rows into what is loaded, so older pages the user opened stay in place.
        setJobs(old=>{
          const fresh=new Map(data.jobs.map(job=>[job.id,job]));
          const known=new Set(old.map(job=>job.id));
          return [...data.jobs.filter(job=>!known.has(job.id)),...old.map(job=>fresh.get(job.id)||job)];
        });
      }else{
        setJobs(old=>before?old.concat(data.jobs):data.jobs);
        setCursor(data.next_cursor);
      }
      setError(null);
    }catch(failure){if(!quiet)setError(failure);}
    finally{setLoading(false);setLoadingMore(false);}
  },[call,status]);
  useEffect(()=>{setJobs([]);load();},[load]);
  const hasActive=jobs.some(job=>['queued','running'].includes(job.status));
  // Keep running jobs fresh without flashing the table.
  useEffect(()=>{
    if(!hasActive)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load({quiet:true});},5000);
    return()=>clearInterval(timer);
  },[hasActive,load]);

  const runAgain=async job=>{try{const data=await call(`/api/jobs/${job.id}/retry`,{});toast.success('New job started');navigate('jobs',data.job_id);}catch(failure){toast.error(failure.message);}};
  const rows=useMemo(()=>jobs.filter(job=>matches(job,query,[row=>row.queries.map(item=>item.query).join(' '),'id'])),[jobs,query]);

  const columns=[
    {key:'query',header:'Query',className:'max-w-0 w-full',cell:job=><div className="min-w-0"><Link href={href('jobs',job.id)} onClick={event=>event.stopPropagation()} className="block truncate font-medium hover:underline" title={job.queries.map(item=>item.query).join(', ')}>{job.queries[0]?.query||'—'}{job.queries.length>1&&<span className="font-normal text-muted-foreground"> +{job.queries.length-1} more</span>}</Link><IdPill value={job.id}/></div>},
    {key:'status',header:'Status',cell:job=><StatusBadge status={job.status}/>},
    {key:'progress',header:'Found',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:job=>{const share=percent(job.returned,Number(job.requested));return <div className="grid w-36 gap-1"><span className="text-xs tabular-nums text-muted-foreground">{job.returned.toLocaleString()} / {Number(job.requested).toLocaleString()}</span><div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${share}%`}}/></div></div>;}},
    {key:'created',header:'Created',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground',cell:job=><TimeAgo value={job.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:job=><RowActions items={[
      {label:'Open job',icon:ExternalLink,onSelect:()=>navigate('jobs',job.id)},
      {label:'Run again',icon:Repeat2,disabled:['queued','running'].includes(job.status),onSelect:()=>runAgain(job)},
      {label:'Copy job ID',icon:Copy,onSelect:()=>copyWithToast(job.id,'Job ID')},
    ]}/>},
  ];

  return <>
    <PageHeader title="Search jobs" description="Every search you’ve run from the playground or the API. Finished jobs are removed after the retention period."
      actions={<Button asChild><Link href={href('playground')}><Sparkles/>New search</Link></Button>}/>
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={()=>load()} caption="Search jobs"
      onRowClick={job=>navigate('jobs',job.id)}
      toolbar={<TableToolbar end={<Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=>load()}><RefreshCw className={loading?'animate-spin':undefined}/>Refresh</Button>}>
        <Tabs value={status} onValueChange={setStatus}><TabsList className="h-8 max-w-full overflow-x-auto overflow-y-hidden">{STATUSES.map(([value,label])=><TabsTrigger key={value} value={value} className="text-xs">{label}</TabsTrigger>)}</TabsList></Tabs>
        <SearchInput value={query} onChange={setQuery} placeholder="Filter loaded jobs…"/>
      </TableToolbar>}
      empty={query?<EmptyState icon={Search} title="No matching jobs" description={`Nothing loaded matches “${query}”.`} action={<Button variant="outline" onClick={()=>setQuery('')}>Clear filter</Button>}/>
        :status!=='all'?<EmptyState icon={Search} title={`No ${status} jobs`} description="Try another status, or look at all jobs." action={<Button variant="outline" onClick={()=>setStatus('all')}>Show all jobs</Button>}/>
        :<EmptyState icon={Sparkles} title="No searches yet" description="Run a search from the playground or call the API, and every job will show up here." action={<Button asChild><Link href={href('playground')}>Run your first search</Link></Button>}/>}
      footer={cursor&&!query&&<LoadMore loading={loadingMore} onClick={()=>load({before:cursor})}>Load older jobs</LoadMore>}/>
  </>;
}
