'use client';
import {useEffect,useMemo} from 'react';
import Link from 'next/link';
import {Copy,ExternalLink,Repeat2,Sparkles} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {DataTable,IdPill,PageHeader,RowActions,StatusBadge,TimeAgo,copyWithToast,toast} from '@/components/workspace/ui';
import {ExportButton,FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {isoTime} from '@/lib/display';
import {percent} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';

const STATUS_OPTIONS=[['running','Running'],['queued','Queued'],['complete','Complete'],['partial','Partial'],['cancelled','Cancelled']];
const DEFAULTS={sort:'created_desc'};
const ACTIVE_POLL=5000;
const JOB_CSV=[['job_id',j=>j.id],['status',j=>j.status],['queries',j=>j.queries.map(q=>q.query).join(' | ')],['found',j=>j.returned],['requested',j=>j.requested],['project',j=>j.project_name],['account',j=>j.user_email||''],['created_at',j=>isoTime(j.created)],['updated_at',j=>isoTime(j.updated)]];

/** Project and key choices for filters: everything the viewer can see, or one account's when `userId` is set. */
export function useOwnedOptions(userId){
  const suffix=userId?`?page=1&page_size=100&user_id=${encodeURIComponent(userId)}`:'';
  const projects=useResource(`/api/projects${suffix}`),keys=useResource(`/api/keys${suffix}`);
  return {projects:projects.data?.projects||[],keys:keys.data?.keys||[]};
}

/**
 * The jobs table with its filters and pages. `fixed` locks filters that aren't shown, e.g. {user_id} on an
 * administrator's user page; `showAccount` adds the owner column when several accounts can appear.
 */
export function JobsList({fixed={},showAccount=false}){
  const {call,navigate,href,me}=useWorkspace();
  const admin=me.role==='admin';
  const {projects,keys}=useOwnedOptions(fixed.user_id);
  const filters=useMemo(()=>[
    {id:'status',label:'Status',type:'multi',options:STATUS_OPTIONS},
    {id:'project_id',label:'Project',type:'select',anyLabel:'Any project',options:projects.map(p=>[p.id,admin&&!fixed.user_id?`${p.name} · ${p.owner}`:p.name])},
    {id:'key_id',label:'API key',type:'select',anyLabel:'Any key',options:keys.map(k=>[k.id,`${k.name} · ${k.project}`])},
    {id:'created',label:'Created',type:'date'},
  ],[projects,keys,admin,fixed.user_id]);
  const list=useListQuery('/api/jobs',{id:'jobs',itemsKey:'jobs',filters,defaults:DEFAULTS,fixed});

  // While a job on this page is queued or running, reload quietly so progress moves without flashing the table.
  const hasActive=Boolean(list.items?.some(job=>['queued','running'].includes(job.status)));
  const {reload}=list;
  useEffect(()=>{
    if(!hasActive)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')reload({quiet:true});},ACTIVE_POLL);
    return()=>clearInterval(timer);
  },[hasActive,reload]);

  const runAgain=async job=>{try{const data=await call(`/api/jobs/${job.id}/retry`,{});toast.success('New job started');navigate('jobs',data.job_id);}catch(failure){toast.error(failure.message);}};

  const columns=[
    {key:'query',header:'Query',className:'max-w-0 w-full',cell:job=><div className="min-w-0"><Link href={href('jobs',job.id)} onClick={event=>event.stopPropagation()} className="block truncate font-medium hover:underline" title={job.queries.map(item=>item.query).join(', ')}>{job.queries[0]?.query||'—'}{job.queries.length>1&&<span className="font-normal text-muted-foreground"> +{job.queries.length-1} more</span>}</Link><IdPill value={job.id}/></div>},
    ...(showAccount?[{key:'account',header:'Account',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell max-w-48 truncate',cell:job=><Link href={href('users',job.user_id)} onClick={event=>event.stopPropagation()} className="text-muted-foreground hover:text-foreground hover:underline">{job.user_email}</Link>}]:[]),
    {key:'project',header:'Project',headClassName:'hidden xl:table-cell',className:'hidden xl:table-cell max-w-40 truncate text-muted-foreground',cell:job=>job.project_name||'—'},
    {key:'status',header:'Status',cell:job=><StatusBadge status={job.status}/>},
    {key:'progress',header:'Found',sortKey:'found',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:job=>{const share=percent(job.returned,Number(job.requested));return <div className="grid w-36 gap-1"><span className="text-xs tabular-nums text-muted-foreground">{job.returned.toLocaleString()} / {Number(job.requested).toLocaleString()}</span><div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{width:`${share}%`}}/></div></div>;}},
    {key:'created',header:'Created',sortKey:'created',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground whitespace-nowrap',cell:job=><TimeAgo value={job.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:job=><RowActions items={[
      {label:'Open job',icon:ExternalLink,onSelect:()=>navigate('jobs',job.id)},
      {label:'Run again',icon:Repeat2,disabled:['queued','running'].includes(job.status),onSelect:()=>runAgain(job)},
      {label:'Copy job ID',icon:Copy,onSelect:()=>copyWithToast(job.id,'Job ID')},
    ]}/>},
  ];

  return <DataTable columns={columns} rows={list.items} loading={list.loading} error={list.error} onRetry={()=>list.reload()} caption="Search jobs"
    sort={list.sort} onSort={list.setSort} onRowClick={job=>navigate('jobs',job.id)}
    toolbar={<FilterBar list={list} placeholder="Search queries or job IDs…" end={<ExportButton list={list} filename="pluko-jobs" columns={JOB_CSV}/>}/>}
    empty={<ListEmpty list={list} icon={Sparkles} title="No searches yet" description={fixed.user_id?'This account hasn’t run any searches.':'Run a search from the playground or call the API, and every job will show up here.'} action={!fixed.user_id&&<Button asChild><Link href={href('playground')}>Run your first search</Link></Button>}/>}
    footer={<Pagination list={list} label="jobs"/>}/>;
}

export function Jobs(){
  const {href,me}=useWorkspace();
  const admin=me.role==='admin';
  return <>
    <PageHeader title="Search jobs" description={admin?'Every search on this Pluko instance, across all accounts.':'Every search you’ve run from the playground or the API. Finished jobs are removed after the retention period.'}
      actions={<Button asChild><Link href={href('playground')}><Sparkles/>New search</Link></Button>}/>
    <JobsList showAccount={admin}/>
  </>;
}
