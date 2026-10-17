'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ResultImage} from '@/components/screens/job-results';
import {Activity,ArrowRight,ArrowUpRight,BookOpen,Check,Clock,FolderPlus,KeyRound,Search,Sparkles,Zap} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,CodeBlock,ErrorState,MiniBars,PageHeader,Shimmer,StatCard,StatGridSkeleton,StatusBadge,TimeAgo,UsageMeter,BrandProgress,StatGrid,Callout,Card,CardAction,CardContent,CardDescription,CardHeader,CardTitle,EmptyState} from '@/components/workspace/ui';
import {compactNumber,dailySeries,formatDuration,percent} from '@/lib/ui-helpers';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';


function Onboarding({projects,keys,jobs}){
  const {href,start}=useWorkspace();
  const steps=[
    {done:projects>0,title:'Create a project',text:'One project per application keeps keys, limits and usage separate.',icon:FolderPlus,run:()=>start('projects','create'),action:'Create project'},
    {done:keys>0,title:'Generate an API key',text:'A scoped, expiring key for your backend. It’s shown once.',icon:KeyRound,run:()=>start('keys','create'),action:'Create key'},
    {done:jobs>0,title:'Run your first search',text:'Try a query in the playground and watch results arrive.',icon:Search,to:href('playground'),action:'Open playground'},
  ];
  const complete=steps.filter(step=>step.done).length;
  if(complete===steps.length)return null;
  const next=steps.findIndex(step=>!step.done);
  // The landing page's numbered steps, with the next one highlighted.
  return <section aria-label="Get started" className="overflow-hidden rounded-2xl border bg-card">
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
      <div><p className="text-sm font-medium text-brand">Get started</p><h2 className="mt-1 text-[1.375rem] font-semibold tracking-[-0.03em]">Three steps to your first results.</h2></div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="tabular-nums">{complete} of {steps.length}</span><BrandProgress value={(complete/steps.length)*100} aria-label="Setup progress" className="h-1.5 w-28"/></div>
    </div>
    <ol className="mt-6 grid border-t md:grid-cols-3 md:divide-x">
      {steps.map((step,index)=><li key={step.title} className={cn('flex flex-col gap-3 p-6',index===next&&'bg-brand/[0.04]',index>0&&'border-t md:border-t-0')}>
        <div className="flex items-center gap-3">
          <span className={cn('font-mono text-sm',step.done?'text-emerald-600 dark:text-emerald-400':index===next?'text-brand':'text-muted-foreground')}>{step.done?<Check className="size-4"/>:`0${index+1}`}</span>
          <span className={cn('font-semibold tracking-[-0.01em]',step.done&&'text-muted-foreground line-through decoration-muted-foreground/40')}>{step.title}</span>
        </div>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        {!step.done&&(step.run?<Button type="button" size="sm" variant={index===next?'default':'outline'} className="self-start rounded-full px-4" onClick={step.run}>{step.action}<ArrowRight/></Button>:<Button asChild size="sm" variant={index===next?'default':'outline'} className="self-start rounded-full px-4"><Link href={step.to}>{step.action}<ArrowRight/></Link></Button>)}
      </li>)}
    </ol>
  </section>;
}

function UsageCard({usage}){
  const {href}=useWorkspace();
  if(!usage)return <CardSkeleton lines={3} className="lg:col-span-3"/>;
  const series=dailySeries(usage.projects.flatMap(project=>project.history||[]));
  const week=series.reduce((sum,item)=>sum+item.value,0);
  return <Card className="lg:col-span-3">
    <CardHeader>
      <CardTitle>Provider pages, last 7 days</CardTitle>
      <CardDescription>{week.toLocaleString()} pages this week. One page returns up to {usage.projects[0]?.images_per_page||35} images.</CardDescription>
      <CardAction><Button asChild variant="ghost" size="sm"><Link href={href('projects')}>Projects<ArrowRight/></Link></Button></CardAction>
    </CardHeader>
    <CardContent className="grid gap-6">
      <MiniBars data={series} valueLabel="pages" height={112} lastLabel="Today"/>
      {!usage.projects.length?<p className="text-sm text-muted-foreground">No projects yet, so there’s no usage to show.</p>
      :<div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
        {usage.projects.slice(0,4).map(item=><Link key={item.project_id} href={href('projects',item.project_id)} className="grid gap-2 rounded-lg p-1 transition-colors hover:bg-muted/40">
          <span className="truncate text-sm font-medium">{item.project}</span>
          <UsageMeter used={item.pages_used} quota={item.pages_quota} label={`${item.project} daily usage`}/>
        </Link>)}
      </div>}
    </CardContent>
  </Card>;
}

// The first image a job found, as a small thumbnail.
function JobThumb({job}){
  const {call}=useWorkspace();
  const [image,setImage]=useState(undefined);
  useEffect(()=>{
    let live=true;
    if(!job.returned){setImage(null);return;}
    call(`/api/jobs/${job.id}/results?limit=1&after=0`).then(data=>{if(live)setImage(data.images[0]||null);}).catch(()=>{if(live)setImage(null);});
    return()=>{live=false;};
  },[call,job.id,job.returned]);
  if(image===undefined)return <Shimmer className="size-11 shrink-0 rounded-xl"/>;
  if(!image)return <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Search className="size-4 text-muted-foreground"/></span>;
  return <ResultImage image={image} compact className="size-11 shrink-0 rounded-xl object-cover"/>;
}

function RecentJobs({jobs}){
  const {href}=useWorkspace();
  return <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Recent jobs</CardTitle>
      <CardDescription>Your latest searches and how they finished.</CardDescription>
      <CardAction><Button asChild variant="ghost" size="sm"><Link href={href('jobs')}>View all<ArrowRight/></Link></Button></CardAction>
    </CardHeader>
    <CardContent>
      {!jobs?<div className="grid gap-3">{[1,2,3,4].map(index=><div key={index} className="flex items-center gap-3"><Shimmer className="size-11 rounded-xl"/><div className="grid flex-1 gap-2"><Shimmer className="h-4 w-2/3"/><Shimmer className="h-3 w-1/3"/></div></div>)}</div>
      :!jobs.length?<EmptyState icon={Search} title="No searches yet" description="Your latest jobs will show up here." action={<Button asChild size="sm" className="rounded-full px-4"><Link href={href('playground')}><Sparkles/>Run a search</Link></Button>} className="py-10"/>
      :<ul className="-mx-2 grid">
        {jobs.map(job=><li key={job.id}><Link href={href('jobs',job.id)} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50">
          <JobThumb job={job}/>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{job.queries[0]?.query||'Search job'}{job.queries.length>1&&<span className="text-muted-foreground"> +{job.queries.length-1}</span>}</p><p className="text-xs text-muted-foreground">{job.returned.toLocaleString()} of {Number(job.requested).toLocaleString()} found · <TimeAgo value={job.created}/></p></div>
          <StatusBadge status={job.status}/>
        </Link></li>)}
      </ul>}
    </CardContent>
  </Card>;
}

// Live health for administrators, in the style of the public status page.
function Health({data}){
  const rows=[['API','Accepting requests',true],['Search worker',data.workers.length?'Processing searches':'Offline',data.workers.length>0],['Image source',data.provider_enabled?'Enabled':'Paused',data.provider_enabled]];
  return <section aria-label="Service health" className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3">
    {rows.map(([name,text,ok])=><div key={name} className="flex items-center gap-3 bg-card px-5 py-4">
      <span className="relative flex size-2.5">{ok&&<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50"/>}<span className={cn('relative inline-flex size-2.5 rounded-full',ok?'bg-emerald-500':'bg-amber-500')}/></span>
      <div className="min-w-0"><p className="text-sm font-medium">{name}</p><p className={cn('truncate text-xs',ok?'text-muted-foreground':'text-amber-700 dark:text-amber-400')}>{text}</p></div>
    </div>)}
  </section>;
}

// "Good evening, Jane." from the account email and the viewer's local time.
function greeting(email){
  const hour=new Date().getHours();
  const part=hour<5?'Good evening':hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const word=String(email||'').split('@')[0].split(/[._-]+/)[0]||'';
  const name=/^[a-z]{2,}$/i.test(word)?word[0].toUpperCase()+word.slice(1).toLowerCase():'';
  return name?`${part}, ${name}.`:`${part}.`;
}

export function Overview(){
  const {me,href}=useWorkspace();
  const admin=me.role==='admin';
  const overview=useResource('/api/overview',{poll:30000});
  const usage=useResource('/api/usage');
  const projects=useResource('/api/projects');
  const keys=useResource('/api/keys');
  const jobs=useResource('/api/jobs?limit=5',{poll:15000});
  const data=overview.data;
  const errorRate=data?percent(data.requests.errors||0,data.requests.total||0):0;
  const ready=projects.data&&keys.data&&data;

  return <>
    <PageHeader eyebrow={<span className="text-sm font-medium text-brand">Overview</span>} title={greeting(me.email)} description={admin?'Activity across every account on this Pluko instance.':'Your image search activity at a glance.'}
      actions={<><Button asChild variant="outline"><Link href={href('guide')}><BookOpen/>API guide</Link></Button><Button asChild><Link href={href('playground')}><Sparkles/>New search</Link></Button></>}/>

    {data&&!data.provider_enabled&&<Callout type="warning" title="Searches are paused">{admin?<>The image provider is turned off, so queued jobs are waiting. <Link className="underline underline-offset-2" href={href('provider')}>Turn it back on</Link>.</>:'New searches will wait in the queue until the service resumes. Existing results are still available.'}</Callout>}
    {admin&&data&&!data.workers.length&&<Callout type="danger" title="No search worker is running">Queued jobs won’t be processed until a worker starts. Run <code>npm run worker</code> or check the worker service on the server.</Callout>}

    {admin&&data&&<Health data={data}/>}
    {ready&&!admin&&<Onboarding projects={projects.data.projects.length} keys={keys.data.keys.filter(key=>!key.revoked).length} jobs={data.jobs.total||0}/>}

    {overview.error?<ErrorState error={overview.error} onRetry={overview.reload} title="Couldn’t load your workspace"/>
    :!data?<StatGridSkeleton/>
    :<StatGrid>
      <StatCard label="Search jobs" value={compactNumber(data.jobs.total)} icon={Search} hint={data.jobs.active?`${data.jobs.active} running or queued now`:'None running right now'}/>
      <StatCard label="API requests" value={compactNumber(data.requests.total)} icon={Zap} hint="Dashboard and API calls, all time"/>
      <StatCard label="Error rate" value={`${errorRate}%`} icon={Activity} tone={errorRate>=10?'danger':undefined} hint={`${(data.requests.errors||0).toLocaleString()} responses with status 400 or above`}/>
      <StatCard label="Avg. response" value={formatDuration(data.requests.average_ms||0)} icon={Clock} hint="Time to handle a request"/>
    </StatGrid>}

    <div className="grid gap-6 lg:grid-cols-5">
      <UsageCard usage={usage.data}/>
      <RecentJobs jobs={jobs.data?.jobs}/>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Call Pluko from your backend</CardTitle>
        <CardDescription>Submit a job, then poll it or receive a webhook when it finishes.</CardDescription>
        <CardAction className="flex gap-2"><Button asChild variant="outline" size="sm"><a href="/docs" target="_blank" rel="noopener noreferrer">Docs<ArrowUpRight/></a></Button></CardAction>
      </CardHeader>
      <CardContent><CodeBlock title="Create a search job" language="bash" code={`curl -X POST ${typeof window==='undefined'?'':window.location.origin}/v1/images/search \\\n  -H "Authorization: Bearer $PLUKO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "query": "mountain landscape", "count": "15" }'`}/></CardContent>
    </Card>
  </>;
}
