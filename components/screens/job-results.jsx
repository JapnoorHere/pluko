'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Copy,Download,ExternalLink,Flag,ImageOff,LayoutGrid,List,Maximize2} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CopyButton,DescriptionList,EmptyState,FormDialog,GallerySkeleton,toast,useCopy,CodeBlock} from '@/components/workspace/ui';
import {downloadText,reasonText,resultsToCsv} from '@/lib/display';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Field,FieldLabel} from '@/components/ui/field';
import {Label} from '@/components/ui/label';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Spinner} from '@/components/ui/spinner';
import {Textarea} from '@/components/ui/textarea';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';

export const ACTIVE=['queued','running'];
const PAGE=48;
const EXPORT_CAP=20000;
const POLL_MS=2500;

// Loads a job and its results, and keeps both fresh while the job is still running.
export function useJob(id){
  const {call}=useWorkspace();
  const [job,setJob]=useState(),[images,setImages]=useState([]),[more,setMore]=useState(false),[error,setError]=useState(null),[loadingMore,setLoadingMore]=useState(false);
  const tail=useRef(0),stepping=useRef(false);
  const loadResults=useCallback(async(after,replace=false)=>{
    const data=await call(`/api/jobs/${id}/results?limit=${PAGE}&after=${after}`);
    setImages(old=>replace?data.images:old.concat(data.images));
    tail.current=data.poll_after;
    setMore(data.next_cursor!==null);
    return data;
  },[call,id]);
  const reload=useCallback(async()=>{
    try{
      const [detail]=await Promise.all([call(`/api/jobs/${id}`),loadResults(0,true)]);
      setJob(detail.job);setError(null);
    }catch(failure){setError(failure);}
  },[call,id,loadResults]);
  useEffect(()=>{setJob(undefined);setImages([]);tail.current=0;reload();},[reload]);
  const active=job&&ACTIVE.includes(job.status);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(async()=>{
      if(stepping.current||document.visibilityState!=='visible')return;
      stepping.current=true;
      try{const detail=await call(`/api/jobs/${id}`);setJob(detail.job);await loadResults(tail.current);}
      catch{}finally{stepping.current=false;}
    },POLL_MS);
    return()=>clearInterval(timer);
  },[active,call,id,loadResults]);
  const loadMore=async()=>{setLoadingMore(true);try{await loadResults(tail.current);}catch(failure){toast.error(failure.message);}finally{setLoadingMore(false);}};
  return {job,images,more,error,active,reload,loadMore,loadingMore};
}

export function useJobActions(job,{onRetried}={}){
  const {call}=useWorkspace();
  const [exporting,setExporting]=useState(false),[retrying,setRetrying]=useState(false);
  const cancel=async()=>{await call(`/api/jobs/${job.id}/cancel`,{});toast.success('Cancellation requested');};
  const runAgain=async()=>{
    setRetrying(true);
    try{const data=await call(`/api/jobs/${job.id}/retry`,{});toast.success('New job started');onRetried?.(data.job_id);}
    catch(failure){toast.error(failure.message);}
    finally{setRetrying(false);}
  };
  const exportAs=async kind=>{
    setExporting(true);
    const pending=toast.loading('Preparing export…');
    try{
      const rows=[];let after=0;
      for(;;){
        const data=await call(`/api/jobs/${job.id}/results?limit=100&after=${after}`);
        rows.push(...data.images);
        if(data.next_cursor===null||rows.length>=EXPORT_CAP)break;
        after=data.next_cursor;
      }
      const list=rows.slice(0,EXPORT_CAP);
      if(!list.length){toast.info('There are no results to export yet',{id:pending});return;}
      const stem=`pluko-${job.id}`;
      if(kind==='csv')downloadText(`${stem}.csv`,resultsToCsv(list),'text/csv;charset=utf-8');
      else if(kind==='json')downloadText(`${stem}.json`,JSON.stringify({job_id:job.id,status:job.status,images:list},null,2),'application/json');
      else downloadText(`${stem}-urls.txt`,list.map(row=>row.image_url).join('\n'),'text/plain;charset=utf-8');
      toast.success(`Exported ${list.length.toLocaleString()} result${list.length===1?'':'s'}${list.length>=EXPORT_CAP?` (limit ${EXPORT_CAP.toLocaleString()})`:''}`,{id:pending});
    }catch(failure){toast.error(failure.message,{id:pending});}
    finally{setExporting(false);}
  };
  return {cancel,runAgain,exportAs,exporting,retrying};
}

export function ExportMenu({job,exportAs,exporting}){
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={exporting||!job.returned}>{exporting?<Spinner/>:<Download/>}Export</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="text-xs text-muted-foreground">Download {job.returned.toLocaleString()} results</DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <DropdownMenuItem onSelect={()=>exportAs('csv')}>CSV<span className="ml-auto text-xs text-muted-foreground">spreadsheet</span></DropdownMenuItem>
      <DropdownMenuItem onSelect={()=>exportAs('json')}>JSON<span className="ml-auto text-xs text-muted-foreground">all fields</span></DropdownMenuItem>
      <DropdownMenuItem onSelect={()=>exportAs('urls')}>Image URLs<span className="ml-auto text-xs text-muted-foreground">.txt</span></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function ResultImage({image,className,full=false,compact=false}){
  const [failed,setFailed]=useState(false),[loaded,setLoaded]=useState(false);
  const src=full?(image.image_url||image.thumbnail_url):(image.thumbnail_url||image.image_url);
  if(!src||failed)return <div className={cn('flex aspect-video w-full flex-col items-center justify-center gap-1.5 bg-muted text-xs text-muted-foreground',className)}><ImageOff className="size-4"/>{!compact&&'Preview unavailable'}</div>;
  return <img src={src} alt={image.title||'Search result'} loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)} className={cn('bg-muted transition-opacity duration-300',!loaded&&'opacity-0',className)}/>;
}

const REASONS=[['not_relevant','Not relevant','The image doesn’t match the query.'],['watermark','Watermarked','A stock watermark or logo is visible.'],['broken','Broken','The image or its link doesn’t load.'],['other','Something else','Tell us in the details below.']];

export function ReportDialog({open,onOpenChange,jobId,image}){
  const {call}=useWorkspace();
  const [reason,setReason]=useState('not_relevant'),[note,setNote]=useState('');
  useEffect(()=>{if(open){setReason('not_relevant');setNote('');}},[open]);
  return <FormDialog open={open} onOpenChange={onOpenChange} title="Report this result" description="Reports help improve ranking and source rules. They stay linked to this job." submitLabel="Send report" busyLabel="Sending…"
    onSubmit={async()=>{await call('/api/feedback',{job_id:jobId,result_id:image.id,reason,note});toast.success('Thanks. Your report was sent.');}}>
    {image&&<div className="flex items-center gap-3 rounded-lg border p-2"><ResultImage image={image} compact className="size-14 shrink-0 rounded-md object-cover"/><div className="min-w-0 text-sm"><p className="truncate font-medium">{image.title||image.source_domain}</p><p className="truncate text-xs text-muted-foreground">{image.source_domain}</p></div></div>}
    <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2">
      {REASONS.map(([value,label,hint])=><Label key={value} htmlFor={`reason-${value}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-brand/50 has-[[data-state=checked]]:bg-brand/5">
        <RadioGroupItem id={`reason-${value}`} value={value} className="mt-0.5"/>
        <span className="grid gap-0.5"><span className="text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
      </Label>)}
    </RadioGroup>
    <Field><FieldLabel htmlFor="report-note">Details <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Textarea id="report-note" maxLength={1000} rows={3} value={note} onChange={event=>setNote(event.target.value)} placeholder="Anything that helps us understand the problem"/></Field>
  </FormDialog>;
}

// Full-screen preview with previous/next navigation by button or arrow key.
function Lightbox({images,index,onIndex,onClose,onReport}){
  const image=images[index];
  const [copy]=useCopy();
  useEffect(()=>{
    if(index===null)return;
    const onKey=event=>{
      if(event.key==='ArrowRight'&&index<images.length-1){event.preventDefault();onIndex(index+1);}
      if(event.key==='ArrowLeft'&&index>0){event.preventDefault();onIndex(index-1);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[index,images.length,onIndex]);
  return <Dialog open={index!==null&&Boolean(image)} onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="max-h-[96vh] gap-5 overflow-y-auto rounded-2xl sm:max-w-6xl">
      {image&&<>
        <DialogHeader className="pr-8"><DialogTitle className="truncate text-xl font-semibold tracking-[-0.025em]">{image.title||image.source_domain}</DialogTitle><DialogDescription>{index+1} of {images.length}{image.query?` · “${image.query}”`:''}</DialogDescription></DialogHeader>
        {/* Image on the left; details, actions and the raw result on the right. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
            <ResultImage key={image.id} image={image} full className="lightbox-image w-full object-contain"/>
            <Button type="button" size="icon" variant="secondary" aria-label="Previous image" disabled={index===0} onClick={()=>onIndex(index-1)} className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full shadow-lg"><ChevronLeft/></Button>
            <Button type="button" size="icon" variant="secondary" aria-label="Next image" disabled={index>=images.length-1} onClick={()=>onIndex(index+1)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full shadow-lg"><ChevronRight/></Button>
          </div>
          <div className="grid min-w-0 content-start gap-4">
            <div className="grid gap-2">
              <Button type="button" className="h-10 rounded-full" onClick={()=>copy(image.image_url,'Image URL')}><Copy/>Copy image URL</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-full" asChild><a href={image.image_url} target="_blank" rel="noopener noreferrer"><Maximize2/>Full image</a></Button>
                {image.source_url?<Button type="button" variant="outline" className="rounded-full" asChild><a href={image.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink/>Source</a></Button>:<span/>}
              </div>
            </div>
            <DescriptionList className="sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3" items={[
              ['Source',<a key="s" href={image.source_url||image.image_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{image.source_domain}</a>],
              ['Dimensions',image.width&&image.height?`${image.width} × ${image.height} px`:'Unknown'],
              ['Licence','Unknown. Check the source.'],
              ['Watermark','Not checked; ranking hint only.'],
            ]}/>
            <CodeBlock title="Result JSON" maxHeight="13rem" code={JSON.stringify({id:image.id,query:image.query,title:image.title,image_url:image.image_url,thumbnail_url:image.thumbnail_url,source_url:image.source_url,source_domain:image.source_domain,width:image.width,height:image.height,license_status:image.license_status,watermark_hint:image.watermark_hint},null,2)}/>
            <Button type="button" variant="ghost" className="justify-self-start rounded-full text-muted-foreground" onClick={()=>onReport(image)}><Flag/>Report a problem</Button>
          </div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}

function GridCard({image,onOpen,onReport}){
  return <article className="group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.35)]">
    <button type="button" className="relative block w-full overflow-hidden bg-muted" onClick={onOpen} aria-label={`Preview ${image.title||image.source_domain}`}>
      <ResultImage image={image} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"/>
      {image.query&&<span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-6rem)] items-center truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur">{image.query}</span>}
      {image.width&&image.height&&<span className="absolute right-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur">{image.width}×{image.height}</span>}
    </button>
    <div className="flex items-start gap-2 p-3">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={image.title||''}>{image.title||image.source_domain}</p><p className="truncate text-xs text-muted-foreground">{image.source_domain}</p></div>
      <div className="flex shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <CopyButton value={image.image_url} label="Image URL" iconOnly variant="ghost"/>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Report image" onClick={onReport}><Flag/></Button>
      </div>
    </div>
  </article>;
}

function ListRow({image,onOpen,onReport}){
  return <li className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
    <button type="button" onClick={onOpen} className="shrink-0 overflow-hidden rounded-md border bg-muted" aria-label={`Preview ${image.title||image.source_domain}`}><ResultImage image={image} compact className="h-12 w-20 object-cover"/></button>
    <div className="min-w-0 flex-1"><button type="button" onClick={onOpen} className="block max-w-full truncate text-left text-sm font-medium hover:underline">{image.title||image.source_domain}</button><p className="truncate text-xs text-muted-foreground">{image.source_domain}{image.query?` · ${image.query}`:''}</p></div>
    <span className="hidden w-24 text-right font-mono text-xs text-muted-foreground sm:block">{image.width&&image.height?`${image.width}×${image.height}`:'—'}</span>
    <div className="flex shrink-0"><CopyButton value={image.image_url} label="Image URL" iconOnly variant="ghost"/><Button type="button" variant="ghost" size="icon-sm" aria-label="Report image" onClick={onReport}><Flag/></Button></div>
  </li>;
}

export function ResultsGallery({jobId,images,active,more,loadMore,loadingMore,expected}){
  const [layout,setLayout]=useState('grid'),[open,setOpen]=useState(null),[report,setReport]=useState(null);
  if(!images.length)return active?<div className="grid gap-3"><p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Spinner/>Searching the source. The first results usually arrive within a few seconds.</p><GallerySkeleton count={Math.min(8,Math.max(3,Number(expected)||6))}/></div>
    :<EmptyState icon={ImageOff} title="No images found" description="The source returned nothing new for these queries. Try broader wording or fewer filters."/>;
  return <div className="grid gap-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">{images.length.toLocaleString()} shown{active&&<span className="ml-2 inline-flex items-center gap-1.5 text-brand"><Spinner className="size-3"/>finding more…</span>}</p>
      <ToggleGroup type="single" variant="outline" size="sm" value={layout} onValueChange={value=>value&&setLayout(value)} aria-label="Result layout">
        <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid/></ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view"><List/></ToggleGroupItem>
      </ToggleGroup>
    </div>
    {layout==='grid'
      ?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{images.map((image,index)=><GridCard key={image.id} image={image} onOpen={()=>setOpen(index)} onReport={()=>setReport(image)}/>)}</div>
      :<ul className="divide-y overflow-hidden rounded-lg border">{images.map((image,index)=><ListRow key={image.id} image={image} onOpen={()=>setOpen(index)} onReport={()=>setReport(image)}/>)}</ul>}
    {active&&<GallerySkeleton count={3}/>}
    {more&&!active&&<div className="flex justify-center"><Button type="button" variant="outline" disabled={loadingMore} onClick={loadMore}>{loadingMore&&<Spinner/>}{loadingMore?'Loading…':'Load more results'}</Button></div>}
    <Lightbox images={images} index={open} onIndex={setOpen} onClose={()=>setOpen(null)} onReport={image=>{setOpen(null);setReport(image);}}/>
    <ReportDialog open={Boolean(report)} onOpenChange={next=>{if(!next)setReport(null);}} jobId={jobId} image={report}/>
  </div>;
}

export function QueryBreakdown({queries}){
  return <ul className="divide-y overflow-hidden rounded-lg border">
    {queries.map(query=>{
      const share=Math.min(100,Math.round((query.found/Math.max(1,Number(query.requested)))*100));
      return <li key={query.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_12rem_auto] sm:items-center sm:gap-6">
        <div className="min-w-0"><p className="truncate text-sm font-medium">{query.query}</p><p className="text-xs text-muted-foreground">{reasonText(query.reason)}</p></div>
        <div className="grid gap-1"><div className="flex justify-between text-xs text-muted-foreground"><span className="tabular-nums">{query.found.toLocaleString()} / {Number(query.requested).toLocaleString()}</span><span className="tabular-nums">{share}%</span></div><div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{width:`${share}%`}}/></div></div>
        <QueryStatus status={query.status}/>
      </li>;
    })}
  </ul>;
}

function QueryStatus({status}){
  return <span className={cn('justify-self-start text-xs font-medium capitalize sm:justify-self-end',status==='complete'&&'text-emerald-600 dark:text-emerald-400',status==='partial'&&'text-amber-600 dark:text-amber-400',['queued','running'].includes(status)&&'text-brand',status==='cancelled'&&'text-muted-foreground')}>{status}</span>;
}
