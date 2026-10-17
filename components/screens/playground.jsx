'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {AlertTriangle,FolderPlus,Plus,RotateCcw,SlidersHorizontal,Sparkles,X} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,ErrorState,IdPill,InlineError,Kbd,PageHeader,StatusBadge,SwitchField,EmptyState,toast,BrandProgress,Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/workspace/ui';
import {JobHeaderActions} from '@/components/screens/job-detail';
import {ResultsGallery,useJob} from '@/components/screens/job-results';
import {estimatePages,parseDomains,parseQueries} from '@/lib/search-form';
import {percent} from '@/lib/ui-helpers';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';

import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Spinner} from '@/components/ui/spinner';
import {Textarea} from '@/components/ui/textarea';

const FILTERS=[
  ['safe_search','Safe search',[['moderate','Moderate'],['strict','Strict']]],
  ['image_type','Image type',[['any','Any'],['photo','Photo'],['clipart','Clip art'],['line_drawing','Line drawing'],['animated_gif','Animated GIF'],['transparent','Transparent background']]],
  ['layout','Shape',[['any','Any'],['square','Square'],['wide','Wide'],['tall','Tall']]],
  ['size','Size',[['any','Any'],['small','Small'],['medium','Medium'],['large','Large'],['wallpaper','Wallpaper']]],
  ['color','Colour',[['any','Any'],['color','Full colour'],['black_white','Black and white'],['red','Red'],['orange','Orange'],['yellow','Yellow'],['green','Green'],['teal','Teal'],['blue','Blue'],['purple','Purple'],['pink','Pink'],['brown','Brown'],['black','Black'],['gray','Gray'],['white','White']]],
];
const DEFAULT_FILTERS={safe_search:'moderate',image_type:'any',layout:'any',size:'any',color:'any'};
const SAMPLES=['mountain landscape','wireless headphones','abstract blue texture','modern office interior'];
const optionLabel=(name,value)=>FILTERS.find(([key])=>key===name)?.[2].find(([option])=>option===value)?.[1]||value;

function LiveJob({id,onReset}){
  const {job,images,more,error,active,reload,loadMore,loadingMore}=useJob(id);
  if(error&&!job)return <ErrorState error={error} onRetry={reload} title="Couldn’t load the job"/>;
  if(!job)return <CardSkeleton lines={2}/>;
  const share=percent(job.returned,Number(job.requested));
  return <section className="grid gap-4" aria-label="Search results">
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2"><CardTitle>Results</CardTitle><StatusBadge status={job.status}/><IdPill value={job.id} length={18}/></div>
          <div className="flex flex-wrap gap-2"><JobHeaderActions job={job} active={active} reload={reload} compact/><Button type="button" variant="ghost" onClick={onReset}><RotateCcw/>New search</Button></div>
        </div>
        <div className="grid gap-1.5"><div className="flex justify-between text-xs text-muted-foreground"><span className="tabular-nums">{job.returned.toLocaleString()} of {Number(job.requested).toLocaleString()} found</span><span className="tabular-nums">{share}%</span></div><BrandProgress value={share} aria-label="Search progress"/></div>
      </CardHeader>
    </Card>
    <ResultsGallery jobId={job.id} images={images} active={active} more={more} loadMore={loadMore} loadingMore={loadingMore} expected={job.requested}/>
  </section>;
}

export function Playground(){
  const {call,href}=useWorkspace();
  const projects=useResource('/api/projects');
  const usage=useResource('/api/usage');
  const [project,setProject]=useState(''),[queries,setQueries]=useState(''),[count,setCount]=useState('15'),[width,setWidth]=useState('800');
  const [filters,setFilters]=useState(DEFAULT_FILTERS),[domains,setDomains]=useState(''),[clean,setClean]=useState(true),[sheet,setSheet]=useState(false);
  const [job,setJob]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null);
  useEffect(()=>{if(projects.data&&!project)setProject(projects.data.projects[0]?.id||'');},[projects.data,project]);

  const list=useMemo(()=>parseQueries(queries),[queries]);
  const pages=estimatePages(count.trim(),list.length);
  const excluded=parseDomains(domains);
  const activeFilters=[...Object.entries(filters).filter(([name,value])=>value!==DEFAULT_FILTERS[name]).map(([name,value])=>({key:name,label:`${FILTERS.find(([key])=>key===name)[1]}: ${optionLabel(name,value)}`,clear:()=>setFilters(current=>({...current,[name]:DEFAULT_FILTERS[name]}))})),
    ...(excluded.length?[{key:'domains',label:`Excluding ${excluded.length} site${excluded.length===1?'':'s'}`,clear:()=>setDomains('')}]:[]),
    ...(!clean?[{key:'clean',label:'Watermarked sources allowed',clear:()=>setClean(true)}]:[])];
  const projectUsage=usage.data?.projects.find(item=>item.project_id===project);
  const overQuota=projectUsage&&pages!==null&&pages>projectUsage.pages_remaining;

  const submit=async event=>{
    event?.preventDefault();
    setError(null);
    if(!list.length){setError(new Error('Add at least one search query.'));return;}
    if(pages===null){setError(new Error('Images per query must be a whole number, 1 or more.'));return;}
    setBusy(true);
    try{
      const data=await call('/api/search',{project_id:project,queries:list.map(query=>({query,count:count.trim()})),min_width:Number(width)||0,watermark_policy:clean?'prefer_clean':'any',exclude_domains:excluded,...filters});
      setJob(data.job_id);
      toast.success(data.reused?'Matching job already exists, showing it':'Search started');
      usage.reload({quiet:true});
      setTimeout(()=>document.getElementById('playground-results')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    }catch(failure){setError(failure);}
    finally{setBusy(false);}
  };
  const addSample=sample=>setQueries(current=>parseQueries(current).some(item=>item.toLowerCase()===sample)?current:current.trim()?`${current.trim()}\n${sample}`:sample);
  const removeQuery=query=>setQueries(parseQueries(queries).filter(item=>item!==query).join('\n'));

  if(projects.error)return <><PageHeader title="Playground"/><ErrorState error={projects.error} onRetry={projects.reload}/></>;
  if(projects.data&&!projects.data.projects.length)return <><PageHeader title="Playground" description="Try searches and inspect results before you integrate."/><EmptyState icon={FolderPlus} title="Create a project first" description="Searches, usage and API keys belong to a project. You can create one in a few seconds." action={<Button asChild><Link href={href('projects')}><Plus/>Create a project</Link></Button>}/></>;

  return <>
    <PageHeader title="Playground" description="Run a search the same way your backend would, and watch results arrive live."/>
    <form onSubmit={submit} onKeyDown={event=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();submit();}}} className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-3 border-b px-4 py-3" aria-hidden><span className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#ff5f57]"/><span className="size-2.5 rounded-full bg-[#febc2e]"/><span className="size-2.5 rounded-full bg-[#28c840]"/></span><span className="text-xs font-medium text-muted-foreground">New search</span></div>
        <CardHeader className="px-6 pt-6"><CardTitle className="text-[1.375rem] tracking-[-0.03em]">What are you looking for?</CardTitle><CardDescription>One query per line. Each query gets its own count, up to the source’s limit.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 px-6 pt-5 pb-6">
          <Field>
            <FieldLabel htmlFor="play-queries" className="sr-only">Queries</FieldLabel>
            <Textarea id="play-queries" rows={4} autoFocus placeholder={'mountain landscape\nwireless headphones'} className="min-h-32 rounded-2xl bg-background px-4 py-3 text-[17px] font-medium shadow-sm" value={queries} onChange={event=>setQueries(event.target.value)}/>
            {list.length>0?<div className="flex flex-wrap gap-1.5 pt-1">{list.map(query=><Badge key={query} variant="secondary" className="gap-1 pr-1">{query}<button type="button" aria-label={`Remove ${query}`} onClick={()=>removeQuery(query)} className="rounded-sm p-0.5 hover:bg-background/60"><X className="size-3"/></button></Badge>)}</div>
            :<div className="flex flex-wrap items-center gap-1.5 pt-1"><span className="text-xs text-muted-foreground">Try:</span>{SAMPLES.map(sample=><Button key={sample} type="button" variant="outline" size="xs" onClick={()=>addSample(sample)}><Plus/>{sample}</Button>)}</div>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field><FieldLabel htmlFor="play-project">Project</FieldLabel>{projects.data?<Select value={project||undefined} onValueChange={setProject}><SelectTrigger id="play-project" className="w-full"><SelectValue placeholder="Select a project"/></SelectTrigger><SelectContent>{projects.data.projects.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>:<div className="h-8 animate-pulse rounded-lg bg-muted"/>}</Field>
            <Field><FieldLabel htmlFor="play-count">Images per query</FieldLabel><Input id="play-count" inputMode="numeric" value={count} onChange={event=>setCount(event.target.value.replace(/[^\d]/g,''))} aria-invalid={pages===null&&list.length>0}/></Field>
            <Field><FieldLabel htmlFor="play-width">Min. width (px)</FieldLabel><Input id="play-width" type="number" min="0" max="20000" step="100" value={width} onChange={event=>setWidth(event.target.value)}/></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={()=>setSheet(true)}><SlidersHorizontal/>Filters{activeFilters.length>0&&<Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{activeFilters.length}</Badge>}</Button>
            {activeFilters.map(filter=><Badge key={filter.key} variant="outline" className="gap-1 pr-1">{filter.label}<button type="button" aria-label={`Remove filter ${filter.label}`} onClick={filter.clear} className="rounded-sm p-0.5 hover:bg-muted"><X className="size-3"/></button></Badge>)}
            {activeFilters.length>0&&<Button type="button" variant="ghost" size="xs" onClick={()=>{setFilters(DEFAULT_FILTERS);setDomains('');setClean(true);}}>Reset all</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-20">
        <CardHeader><CardTitle>Summary</CardTitle><CardDescription>What this search will use.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Queries</span><span className="font-medium tabular-nums">{list.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Images requested</span><span className="font-medium tabular-nums">{pages===null||!list.length?'—':(Number(count)*list.length).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Provider pages, at most</span><span className="font-medium tabular-nums">{pages===null||!list.length?'—':pages.toLocaleString()}</span></div>
          <Separator/>
          {projectUsage?<div className="grid gap-1.5"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Left today in this project</span><span className="tabular-nums">{projectUsage.pages_remaining.toLocaleString()} pages</span></div><BrandProgress value={percent(projectUsage.pages_used,projectUsage.pages_quota)} aria-label="Daily usage"/></div>:<div className="h-8 animate-pulse rounded bg-muted"/>}
          {overQuota&&<p className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle className="size-4 shrink-0"/>This may use more than today’s remaining pages, so the job can finish as partial.</p>}
          <InlineError error={error}/>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          <Button type="submit" size="lg" className="h-11 rounded-full text-[15px]" disabled={busy||!project}>{busy?<Spinner/>:<Sparkles/>}{busy?'Starting…':'Run search'}</Button>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Kbd>Ctrl</Kbd><Kbd>Enter</Kbd>to run</p>
        </CardFooter>
      </Card>
    </form>

    <Sheet open={sheet} onOpenChange={setSheet}>
      <SheetContent className="flex !w-full flex-col sm:!max-w-md">
        <SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription>Passed to the image source on a best-effort basis, so some results may not match exactly.</SheetDescription></SheetHeader>
        <div className="grid flex-1 content-start gap-5 overflow-y-auto px-4">
          {FILTERS.map(([name,label,options])=><Field key={name}><FieldLabel htmlFor={`play-${name}`}>{label}</FieldLabel><Select value={filters[name]} onValueChange={value=>setFilters(current=>({...current,[name]:value}))}><SelectTrigger id={`play-${name}`} className="w-full"><SelectValue/></SelectTrigger><SelectContent>{options.map(([value,text])=><SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></Field>)}
          <Field><FieldLabel htmlFor="play-domains">Exclude websites</FieldLabel><Textarea id="play-domains" rows={3} placeholder="example.com, another.com" value={domains} onChange={event=>setDomains(event.target.value)}/><FieldDescription>Domains only, separated by commas or spaces.</FieldDescription></Field>
          <SwitchField label="Prefer sources without watermarks" description="Ranks likely stock-photo sites lower. A hint from titles and domains, not a guarantee." checked={clean} onChange={setClean}/>
          <p className="text-xs text-muted-foreground">Licensing isn’t checked. Review each source before you reuse an image.</p>
        </div>
        <SheetFooter className="flex-row gap-2 border-t"><Button type="button" variant="outline" className="flex-1" onClick={()=>{setFilters(DEFAULT_FILTERS);setDomains('');setClean(true);}}>Reset</Button><Button type="button" className="flex-1" onClick={()=>setSheet(false)}>Apply filters</Button></SheetFooter>
      </SheetContent>
    </Sheet>

    <div id="playground-results" className="scroll-mt-20">{job&&<LiveJob key={job} id={job} onReset={()=>{setJob(null);window.scrollTo({top:0,behavior:'smooth'});}}/>}</div>
  </>;
}
