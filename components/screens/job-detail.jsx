'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Ban,Repeat2,SearchX} from 'lucide-react';
import {useFilterState} from '@/components/workspace/list';
import {useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,DescriptionList,EmptyState,IdPill,PageHeader,Shimmer,StatCard,StatusBadge,TimeAgo,BrandProgress,StatGrid,Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/workspace/ui';
import {ExportMenu,QueryBreakdown,ResultsGallery,useJob,useJobActions} from '@/components/screens/job-results';
import {format} from '@/lib/display';
import {percent} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';

import {Spinner} from '@/components/ui/spinner';

const FILTER_LABELS={min_width:'Minimum width',safe_search:'Safe search',image_type:'Image type',layout:'Shape',size:'Size',color:'Colour',watermark_policy:'Watermarks',exclude_domains:'Excluded sites'};

function describeFilters(filters={}){
  return Object.entries(FILTER_LABELS).map(([key,label])=>{
    const value=filters[key];
    if(value===undefined||value===null||value===''||value==='any'||(Array.isArray(value)&&!value.length)||(key==='min_width'&&!Number(value)))return null;
    const raw=Array.isArray(value)?value.join(', '):key==='min_width'?`${value} px`:key==='watermark_policy'?(value==='prefer_clean'?'Prefer clean sources':'Any'):String(value).replaceAll('_',' ');
    const text=key==='exclude_domains'||key==='min_width'?raw:raw[0].toUpperCase()+raw.slice(1);
    return [label,<span key={key}>{text}</span>];
  }).filter(Boolean);
}

export function JobHeaderActions({job,active,reload,compact=false}){
  const {navigate,href}=useWorkspace();
  const [confirm,setConfirm]=useState(false);
  const {cancel,runAgain,exportAs,exporting,retrying}=useJobActions(job,{onRetried:id=>navigate('jobs',id)});
  return <>
    {compact&&<Button asChild variant="outline"><Link href={href('jobs',job.id)}>Open job page<ArrowUpRight/></Link></Button>}
    {active?<Button type="button" variant="outline" onClick={()=>setConfirm(true)}><Ban/>Cancel</Button>
      :<Button type="button" variant="outline" disabled={retrying} onClick={runAgain}>{retrying?<Spinner/>:<Repeat2/>}Run again</Button>}
    <ExportMenu job={job} exportAs={exportAs} exporting={exporting}/>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Cancel this search?" description="Searching stops after the current page. Results found so far are kept, and the job is marked cancelled." confirmLabel="Cancel search" busyLabel="Cancelling…" onConfirm={async()=>{await cancel();await reload();}}/>
  </>;
}

const RESULT_FILTERS=[
  {id:'orientation',label:'Shape',type:'select',anyLabel:'Any shape',options:[['landscape','Landscape'],['portrait','Portrait'],['square','Square']]},
  {id:'min_width',label:'Width',type:'select',anyLabel:'Any width',options:[['800','800 px or wider'],['1200','1200 px or wider'],['1920','1920 px or wider'],['2560','2560 px or wider']]},
  {id:'watermark',label:'Watermark',type:'select',anyLabel:'Any',options:[['clear','No watermark signals'],['flagged','Possible watermark']]},
];

export function JobPage(){
  const {route,href}=useWorkspace();
  // Batch jobs also get a filter for each of their queries, once the job has loaded.
  const [queryOptions,setQueryOptions]=useState([]);
  const definitions=useMemo(()=>queryOptions.length>1?[{id:'query',label:'Query',type:'select',anyLabel:'All queries',options:queryOptions},...RESULT_FILTERS]:RESULT_FILTERS,[queryOptions]);
  const resultFilters=useFilterState(definitions,{prefix:'r.'});
  const {job,images,more,error,active,reload,loadMore,loadingMore,counts,filtering}=useJob(route.id,resultFilters.query);
  const queriesKey=job?JSON.stringify(job.queries.map(item=>item.query)):'';
  useEffect(()=>{if(queriesKey)setQueryOptions(JSON.parse(queriesKey).map(query=>[query,query]));},[queriesKey]);
  const {setCrumb}=useWorkspace();
  const crumbText=job?(job.queries[0]?.query||'Search job')+(job.queries.length>1?` +${job.queries.length-1}`:''):null;
  useEffect(()=>{if(crumbText)setCrumb(crumbText);},[crumbText,setCrumb]);
  const back={href:href('jobs'),label:'Search jobs'};

  if(error&&!job)return <><PageHeader title="Job not found" back={back}/><EmptyState icon={SearchX} title="We couldn’t open this job" description={error.status===404?'It may have been removed by the retention policy, or it belongs to another account.':error.message} action={<Button asChild><Link href={href('jobs')}>Back to search jobs</Link></Button>}/></>;
  if(!job)return <div className="grid gap-6"><div className="space-y-2"><Shimmer className="h-4 w-24"/><Shimmer className="h-8 w-72 max-w-full"/></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(index=><Shimmer key={index} className="h-28"/>)}</div><Shimmer className="h-40"/></div>;

  const first=job.queries[0]?.query||'Search job';
  const progress=percent(job.returned,Number(job.requested));
  const filters=describeFilters(job.filters);
  return <>
    <PageHeader back={back} title={job.queries.length>1?`${first} + ${job.queries.length-1} more`:first}
      eyebrow={<><StatusBadge status={job.status}/><IdPill value={job.id} length={20}/></>}
      actions={<JobHeaderActions job={job} active={active} reload={reload}/>}/>

    <StatGrid>
      <StatCard label="Found" value={job.returned.toLocaleString()} hint={`of ${Number(job.requested).toLocaleString()} requested`} footer={<BrandProgress value={progress} className="w-full" aria-label="Job progress"/>}/>
      <StatCard label="Queries" value={job.queries.length} hint={job.queries.filter(query=>query.status==='complete').length+' complete'}/>
      <StatCard label="Started" value={<TimeAgo value={job.created} className="text-2xl"/>} hint={format(job.created)}/>
      <StatCard label={job.expires?'Results kept until':'Status'} value={job.expires?<TimeAgo value={job.expires} className="text-2xl"/>:<span className="text-2xl capitalize">{job.status}</span>} hint={job.expires?'Export anything you need before then.':'Results appear below as they are found.'}/>
    </StatGrid>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Queries</CardTitle><CardDescription>Progress and outcome for each query in this job.</CardDescription></CardHeader><CardContent><QueryBreakdown queries={job.queries}/></CardContent></Card>
      <Card><CardHeader><CardTitle>Search settings</CardTitle><CardDescription>Filters sent with this job.</CardDescription></CardHeader><CardContent>{filters.length?<DescriptionList className="sm:grid-cols-[8rem_1fr]" items={filters}/>:<p className="text-sm text-muted-foreground">Default settings, no filters.</p>}</CardContent></Card>
    </div>

    <section className="grid gap-4">
      <h2 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.03em]">Results</h2>
      <ResultsGallery jobId={job.id} images={images} active={active} more={more} loadMore={loadMore} loadingMore={loadingMore} expected={job.requested} filters={resultFilters} counts={counts} filtering={filtering}/>
    </section>
  </>;
}
