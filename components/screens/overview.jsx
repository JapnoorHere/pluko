'use client';
import Link from 'next/link';
import {Activity,AlertTriangle,ArrowRight,ArrowUpRight,BookOpen,Check,Clock,FolderPlus,KeyRound,Search,ServerCrash,Sparkles,Zap} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,CodeBlock,ErrorState,MiniBars,PageHeader,Shimmer,StatCard,StatGridSkeleton,StatusBadge,TimeAgo,UsageMeter,BrandProgress,StatGrid} from '@/components/workspace/ui';
import {compactNumber,dailySeries,formatDuration,percent} from '@/lib/ui-helpers';
import {cn} from '@/lib/utils';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card,CardAction,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';


function Onboarding({projects,keys,jobs}){
  const {href,start}=useWorkspace();
  const steps=[
    {done:projects>0,title:'Create a project',text:'One project per application keeps keys and usage separate.',icon:FolderPlus,run:()=>start('projects','create'),action:'Create project'},
    {done:keys>0,title:'Generate an API key',text:'Scoped, expiring keys for your backend.',icon:KeyRound,run:()=>start('keys','create'),action:'Create key'},
    {done:jobs>0,title:'Run your first search',text:'Try a query in the playground and inspect the results.',icon:Search,to:href('playground'),action:'Open playground'},
  ];
  const complete=steps.filter(step=>step.done).length;
  if(complete===steps.length)return null;
  const next=steps.findIndex(step=>!step.done);
  return <Card className="overflow-hidden">
    <CardHeader>
      <CardTitle>Get started with Pluko</CardTitle>
      <CardDescription>{complete} of {steps.length} steps done. Most teams finish in under five minutes.</CardDescription>
      <CardAction className="hidden w-40 sm:block"><BrandProgress value={(complete/steps.length)*100} aria-label="Setup progress"/></CardAction>
    </CardHeader>
    <CardContent className="grid gap-3 md:grid-cols-3">
      {steps.map((step,index)=><div key={step.title} className={cn('flex flex-col gap-3 rounded-lg border p-4 transition-colors',index===next&&'border-brand/40 bg-brand/5',step.done&&'opacity-70')}>
        <div className="flex items-center gap-2">
          <span className={cn('flex size-6 items-center justify-center rounded-full border text-xs font-medium',step.done&&'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')}>{step.done?<Check className="size-3.5"/>:index+1}</span>
          <span className={cn('text-sm font-medium',step.done&&'line-through decoration-muted-foreground/50')}>{step.title}</span>
        </div>
        <p className="flex-1 text-sm text-muted-foreground">{step.text}</p>
        {!step.done&&(step.run?<Button type="button" size="sm" variant={index===next?'default':'outline'} className="self-start" onClick={step.run}>{step.action}<ArrowRight/></Button>:<Button asChild size="sm" variant={index===next?'default':'outline'} className="self-start"><Link href={step.to}>{step.action}<ArrowRight/></Link></Button>)}
      </div>)}
    </CardContent>
  </Card>;
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
      <MiniBars data={series} valueLabel="pages" height={112}/>
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

function RecentJobs({jobs}){
  const {href}=useWorkspace();
  return <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Recent jobs</CardTitle>
      <CardDescription>Your latest searches and how they finished.</CardDescription>
      <CardAction><Button asChild variant="ghost" size="sm"><Link href={href('jobs')}>View all<ArrowRight/></Link></Button></CardAction>
    </CardHeader>
    <CardContent>
      {!jobs?<div className="grid gap-3">{[1,2,3,4].map(index=><Shimmer key={index} className="h-12"/>)}</div>
      :!jobs.length?<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center"><Search className="size-5 text-muted-foreground"/><p className="text-sm text-muted-foreground">No searches yet.</p><Button asChild size="sm"><Link href={href('playground')}><Sparkles/>Run a search</Link></Button></div>
      :<ul className="-mx-2 grid">
        {jobs.map(job=><li key={job.id}><Link href={href('jobs',job.id)} className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{job.queries[0]?.query||'Search job'}{job.queries.length>1&&<span className="text-muted-foreground"> +{job.queries.length-1}</span>}</p><p className="text-xs text-muted-foreground">{job.returned.toLocaleString()} of {Number(job.requested).toLocaleString()} found · <TimeAgo value={job.created}/></p></div>
          <StatusBadge status={job.status}/>
        </Link></li>)}
      </ul>}
    </CardContent>
  </Card>;
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
    <PageHeader title="Overview" description={admin?'Activity across every account on this Pluko instance.':'Your image search activity at a glance.'}
      actions={<><Button asChild variant="outline"><Link href={href('guide')}><BookOpen/>API guide</Link></Button><Button asChild><Link href={href('playground')}><Sparkles/>New search</Link></Button></>}/>

    {data&&!data.provider_enabled&&<Alert className="border-amber-500/30 bg-amber-500/5"><AlertTriangle className="text-amber-500"/><AlertTitle>Searches are paused</AlertTitle><AlertDescription>{admin?<>The image provider is turned off, so queued jobs are waiting. <Link className="underline underline-offset-2" href={href('provider')}>Turn it back on</Link>.</>:'New searches will wait in the queue until the service resumes. Existing results are still available.'}</AlertDescription></Alert>}
    {admin&&data&&!data.workers.length&&<Alert variant="destructive"><ServerCrash/><AlertTitle>No search worker is running</AlertTitle><AlertDescription>Queued jobs won’t be processed until a worker starts. Run <code>npm run worker</code> or check the worker service on the server.</AlertDescription></Alert>}

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
