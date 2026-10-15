'use client';
import {useEffect,useMemo,useState} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {Toggle} from '@/components/dashboard-primitives';
import {JobDetail} from '@/components/job-results';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Field,FieldLabel,FieldDescription} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {estimatePages,parseDomains,parseQueries} from '@/lib/search-form';

const FILTERS=[
  ['safe_search','Safe search',[['moderate','Moderate'],['strict','Strict']]],
  ['image_type','Image type',[['any','Any'],['photo','Photo'],['clipart','Clip art'],['line_drawing','Line drawing'],['animated_gif','Animated GIF'],['transparent','Transparent background']]],
  ['layout','Shape',[['any','Any'],['square','Square'],['wide','Wide'],['tall','Tall']]],
  ['size','Size',[['any','Any'],['small','Small'],['medium','Medium'],['large','Large'],['wallpaper','Wallpaper']]],
  ['color','Colour',[['any','Any'],['color','Full colour'],['black_white','Black and white'],['red','Red'],['orange','Orange'],['yellow','Yellow'],['green','Green'],['teal','Teal'],['blue','Blue'],['purple','Purple'],['pink','Pink'],['brown','Brown'],['black','Black'],['gray','Gray'],['white','White']]],
];
const DEFAULT_FILTERS={safe_search:'moderate',image_type:'any',layout:'any',size:'any',color:'any'};
const SAMPLES=['mountain landscape','wireless headphones','abstract blue texture'];

export function Playground({call,toast,modal,setView}) {
  const [projects,setProjects]=useState([]),[project,setProject]=useState(''),[loaded,setLoaded]=useState(false);
  const [queries,setQueries]=useState(''),[count,setCount]=useState('15'),[width,setWidth]=useState('800');
  const [filters,setFilters]=useState(DEFAULT_FILTERS),[domains,setDomains]=useState(''),[clean,setClean]=useState(true),[open,setOpen]=useState(false);
  const [job,setJob]=useState(null),[busy,setBusy]=useState(false);
  useEffect(()=>{call('/api/projects').then(data=>{setProjects(data.projects);setProject(data.projects[0]?.id||'');setLoaded(true);}).catch(error=>toast(error.message));},[call,toast]);

  const list=useMemo(()=>parseQueries(queries),[queries]);
  const pages=estimatePages(count.trim(),list.length);
  const changed=Object.entries(filters).filter(([name,value])=>value!==DEFAULT_FILTERS[name]).length+(domains.trim()?1:0)+(clean?0:1);

  const submit=async event=>{
    event.preventDefault();
    if(!list.length){toast('Enter at least one search query');return;}
    if(pages===null){toast('Images per query must be a whole number, 1 or more');return;}
    setBusy(true);
    try{
      const data=await call('/api/search',{project_id:project,queries:list.map(query=>({query,count:count.trim()})),min_width:Number(width)||0,watermark_policy:clean?'prefer_clean':'any',exclude_domains:parseDomains(domains),...filters});
      setJob(data.job_id);
      toast('Search job created');
    }catch(error){toast(error.message);}
    finally{setBusy(false);}
  };

  if(loaded&&!projects.length)return <Card><CardHeader><CardTitle>Create a project first</CardTitle><CardDescription>Searches, usage and API keys belong to a project.</CardDescription></CardHeader><CardContent><Button type="button" onClick={()=>setView('projects')}>Create a project</Button></CardContent></Card>;

  return <>
    <Card>
      <CardHeader><CardTitle>Find images for one query or a batch</CardTitle><CardDescription>Searches run in the background. Results appear below as they are found, and the job stays in Search jobs.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid3">
            <Field><FieldLabel htmlFor="play-project">Project</FieldLabel><Select value={project||undefined} onValueChange={setProject}><SelectTrigger id="play-project" className="w-full"><SelectValue placeholder="Select a project"/></SelectTrigger><SelectContent>{projects.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field><FieldLabel htmlFor="play-count">Images per query</FieldLabel><Input id="play-count" inputMode="numeric" value={count} onChange={event=>setCount(event.target.value)} aria-invalid={pages===null}/><FieldDescription>Whole number. The source may have fewer.</FieldDescription></Field>
            <Field><FieldLabel htmlFor="play-width">Minimum width (px)</FieldLabel><Input id="play-width" type="number" min="0" max="20000" value={width} onChange={event=>setWidth(event.target.value)}/></Field>
          </div>
          <Field>
            <FieldLabel htmlFor="play-queries">One query per line</FieldLabel>
            <Textarea id="play-queries" rows={4} placeholder="mountain landscape" value={queries} onChange={event=>setQueries(event.target.value)}/>
            <div className="flex flex-wrap items-center gap-2 pt-1"><span className="text-xs text-muted-foreground">Try:</span>{SAMPLES.map(sample=><Button key={sample} type="button" variant="outline" size="sm" onClick={()=>setQueries(current=>current.trim()?`${current.trim()}\n${sample}`:sample)}>{sample}</Button>)}</div>
          </Field>
          <div>
            <Button type="button" variant="ghost" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><SlidersHorizontal/>Filters{changed>0&&` (${changed})`}</Button>
            {open&&<div className="mt-3 space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FILTERS.map(([name,label,options])=><Field key={name}><FieldLabel htmlFor={`play-${name}`}>{label}</FieldLabel><Select value={filters[name]} onValueChange={value=>setFilters(current=>({...current,[name]:value}))}><SelectTrigger id={`play-${name}`} className="w-full"><SelectValue/></SelectTrigger><SelectContent>{options.map(([value,text])=><SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></Field>)}</div>
              <Field><FieldLabel htmlFor="play-domains">Exclude websites</FieldLabel><Textarea id="play-domains" rows={2} placeholder="example.com, another.com" value={domains} onChange={event=>setDomains(event.target.value)}/><FieldDescription>Domains only, separated by commas or spaces. Results from these sites are skipped.</FieldDescription></Field>
              <Toggle label="Prefer sources without obvious watermarks" description="Ranks likely stock-photo sites lower. This is a hint based on titles and domains, not a guarantee." checked={clean} onChange={setClean}/>
              <p className="text-xs text-muted-foreground">Filters are passed to the image source on a best-effort basis, so some results may not match exactly. Licensing is not checked: review each source before reuse.</p>
            </div>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy||!project}>{busy?'Creating…':'Create search job'}</Button>
            <span className="text-sm text-muted-foreground">{list.length} {list.length===1?'query':'queries'}{pages!==null&&list.length>0?` · about ${pages.toLocaleString()} provider ${pages===1?'page':'pages'} of your daily limit`:''}</span>
          </div>
        </form>
      </CardContent>
    </Card>
    {job&&<JobDetail key={job} id={job} call={call} toast={toast} modal={modal} onOpenJob={setJob}/>}
  </>;
}
