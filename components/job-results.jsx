'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Copy,Download,ExternalLink,Eye,Flag,ImageOff,RefreshCw,Repeat2} from 'lucide-react';
import {StatusBadge} from '@/components/dashboard-primitives';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Field,FieldLabel} from '@/components/ui/field';
import {Textarea} from '@/components/ui/textarea';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';
import {copyText,downloadText,format,reasonText,resultsToCsv} from '@/lib/display';

const ACTIVE=['queued','running'];
const PAGE=48;
const EXPORT_CAP=20000;

export function ResultImage({image,className}) {
  const [failed,setFailed]=useState(false);
  const src=image.thumbnail_url||image.image_url;
  if(!src||failed)return <div className={`${className||''} flex aspect-video w-full items-center justify-center gap-2 bg-muted text-xs text-muted-foreground`}><ImageOff className="size-4"/>Preview unavailable</div>;
  return <img src={src} alt={image.title||'Search result'} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className={className}/>;
}

export function FeedbackForm({jobId,resultId,call,toast,close}) {
  const [reason,setReason]=useState('not_relevant'),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/feedback',{job_id:jobId,result_id:resultId,reason,note});toast('Feedback submitted');close();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <form onSubmit={submit} className="feedbackForm"><h2>Report this image</h2><p>Tell us what is wrong with this result.</p><Field><FieldLabel htmlFor="feedback-reason">Reason</FieldLabel><Select value={reason} onValueChange={setReason}><SelectTrigger id="feedback-reason" className="w-full"><SelectValue placeholder="Select an option"/></SelectTrigger><SelectContent>{[{value:'not_relevant',label:'Not relevant'},{value:'watermark',label:'Watermark'},{value:'broken',label:'Broken image or URL'},{value:'other',label:'Other'}].map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel htmlFor="feedback-note">Details (optional)</FieldLabel><Textarea id="feedback-note" maxLength={1000} value={note} onChange={event=>setNote(event.target.value)} placeholder="What should we know?"/></Field><Button type="submit" disabled={busy}>{busy?'Submitting…':'Submit feedback'}</Button></form>;
}

function Preview({image,jobId,call,toast,modal}) {
  const copy=async(label,value)=>toast(await copyText(value)?`${label} copied`:'Copy failed: select the text manually');
  const rows=[['Query',image.query],['Dimensions',image.width&&image.height?`${image.width} × ${image.height} (from the source, not verified)`:'Unknown'],['Source',image.source_domain],['Watermark','Not checked; a title and domain hint only'],['License','Unknown. Check the source before reuse']];
  return <div className="space-y-4">
    <h2>{image.title||image.source_domain}</h2>
    <div className="overflow-hidden rounded-lg border bg-muted"><ResultImage image={{...image,thumbnail_url:image.image_url||image.thumbnail_url}} className="max-h-[55vh] w-full object-contain"/></div>
    <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">{rows.map(([term,value])=><div key={term} className="contents"><dt className="text-muted-foreground">{term}</dt><dd className="break-words">{value}</dd></div>)}</dl>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={()=>copy('Image URL',image.image_url)}><Copy/>Copy image URL</Button>
      {image.source_url&&<Button type="button" variant="outline" onClick={()=>copy('Source URL',image.source_url)}><Copy/>Copy source URL</Button>}
      <Button type="button" variant="outline" asChild><a href={image.source_url||image.image_url} target="_blank" rel="noopener noreferrer"><ExternalLink/>Open source</a></Button>
      <Button type="button" variant="outline" onClick={()=>modal(<FeedbackForm jobId={jobId} resultId={image.id} call={call} toast={toast} close={()=>modal(null)}/>)}><Flag/>Report</Button>
    </div>
  </div>;
}

export function JobDetail({id,call,toast,modal,onOpenJob}) {
  const [job,setJob]=useState(),[images,setImages]=useState([]),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[exporting,setExporting]=useState(false);
  const tail=useRef(0),stepping=useRef(false);

  const loadResults=useCallback(async(after,replace=false)=>{
    const data=await call(`/api/jobs/${id}/results?limit=${PAGE}&after=${after}`);
    setImages(old=>replace?data.images:old.concat(data.images));
    tail.current=data.poll_after;
    setMore(data.next_cursor!==null);
    return data;
  },[call,id]);

  const reload=useCallback(async()=>{
    const [detail]=await Promise.all([call(`/api/jobs/${id}`),loadResults(0,true)]);
    setJob(detail.job);
  },[call,id,loadResults]);

  useEffect(()=>{setJob(undefined);setImages([]);tail.current=0;reload().catch(error=>toast(error.message));},[reload,toast]);

  const active=job&&ACTIVE.includes(job.status);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(async()=>{
      if(stepping.current)return;
      stepping.current=true;
      try{
        const detail=await call(`/api/jobs/${id}`);
        setJob(detail.job);
        await loadResults(tail.current);
      }catch{}finally{stepping.current=false;}
    },2500);
    return()=>clearInterval(timer);
  },[active,call,id,loadResults]);

  if(!job)return <Skeleton className="h-48"/>;

  const cancel=async()=>{try{await call(`/api/jobs/${id}/cancel`,{});toast('Cancellation requested');await reload();}catch(error){toast(error.message)}};
  const runAgain=async()=>{setBusy(true);try{const data=await call(`/api/jobs/${id}/retry`,{});toast('New job started');onOpenJob?.(data.job_id);}catch(error){toast(error.message)}finally{setBusy(false)}};
  const loadMore=async()=>{try{await loadResults(tail.current);}catch(error){toast(error.message)}};
  const copyId=async()=>toast(await copyText(job.id)?'Job ID copied':'Copy failed');
  const fetchAll=async()=>{
    const rows=[];let after=0;
    for(;;){
      const data=await call(`/api/jobs/${id}/results?limit=100&after=${after}`);
      rows.push(...data.images);
      if(data.next_cursor===null||rows.length>=EXPORT_CAP)break;
      after=data.next_cursor;
    }
    return rows.slice(0,EXPORT_CAP);
  };
  const exportAs=async kind=>{
    setExporting(true);
    try{
      const rows=await fetchAll();
      if(!rows.length){toast('There are no results to export yet');return;}
      const stem=`pluko-${job.id}`;
      if(kind==='csv')downloadText(`${stem}.csv`,resultsToCsv(rows),'text/csv;charset=utf-8');
      else if(kind==='json')downloadText(`${stem}.json`,JSON.stringify({job_id:job.id,status:job.status,images:rows},null,2),'application/json');
      else downloadText(`${stem}-urls.txt`,rows.map(row=>row.image_url).join('\n'),'text/plain;charset=utf-8');
      toast(`Exported ${rows.length} result${rows.length===1?'':'s'}${rows.length>=EXPORT_CAP?` (limit ${EXPORT_CAP})`:''}`);
    }catch(error){toast(error.message)}finally{setExporting(false)}
  };

  return <Card>
    <CardHeader><CardTitle>Search job</CardTitle><CardDescription>{job.expires?`Results are kept until ${format(job.expires)}. Export what you need before then.`:'Results appear here as the worker finds them.'}</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="row jobToolbar">
        <StatusBadge status={job.status}/>
        <button type="button" onClick={copyId} className="font-mono text-xs text-muted-foreground hover:text-foreground" title="Copy job ID">{job.id}</button>
        <Button type="button" variant="outline" onClick={()=>reload().catch(error=>toast(error.message))}><RefreshCw/>Refresh</Button>
        <Button type="button" variant="outline" disabled={!active} onClick={cancel}>Cancel</Button>
        <Button type="button" variant="outline" disabled={active||busy} onClick={runAgain}><Repeat2/>Run again</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={exporting||!job.returned}><Download/>{exporting?'Preparing…':'Export'}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>exportAs('csv')}>CSV (spreadsheet)</DropdownMenuItem><DropdownMenuItem onSelect={()=>exportAs('json')}>JSON (all fields)</DropdownMenuItem><DropdownMenuItem onSelect={()=>exportAs('urls')}>Image URLs only (.txt)</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
      <p aria-live="polite">{job.returned} found · {job.requested} requested{active?' · searching…':''}</p>
      <div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{['Query','Requested','Found','Status','What happened'].map(column=><TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{job.queries.map(q=><TableRow key={q.id}><TableCell>{q.query}</TableCell><TableCell>{q.requested}</TableCell><TableCell>{q.found}</TableCell><TableCell><StatusBadge status={q.status}/></TableCell><TableCell className="text-muted-foreground">{reasonText(q.reason)}</TableCell></TableRow>)}</TableBody></Table></div>
      {!images.length&&<p className="muted">{active?'Waiting for the first results…':'No results were found for this job.'}</p>}
      <div className="gallery">{images.map(image=><article className="image" key={image.id}>
        <button type="button" className="block w-full" onClick={()=>modal(<Preview image={image} jobId={id} call={call} toast={toast} modal={modal}/>)} aria-label={`Preview ${image.title||image.source_domain}`}><ResultImage image={image}/></button>
        <div>
          <a href={image.source_url||image.image_url} target="_blank" rel="noopener noreferrer">{image.title||image.source_domain}</a>
          <small>{image.width&&image.height?`${image.width} × ${image.height} · `:''}{image.source_domain}</small>
          <div className="imageActions">
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="icon" aria-label="Preview image" onClick={()=>modal(<Preview image={image} jobId={id} call={call} toast={toast} modal={modal}/>)}><Eye/></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Copy image URL" onClick={async()=>toast(await copyText(image.image_url)?'Image URL copied':'Copy failed')}><Copy/></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Report image" onClick={()=>modal(<FeedbackForm jobId={id} resultId={image.id} call={call} toast={toast} close={()=>modal(null)}/>)}><Flag/></Button>
            </div>
            <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="!w-auto shrink-0">Full image ↗</a>
          </div>
        </div>
      </article>)}</div>
      {more&&<Button type="button" variant="outline" onClick={loadMore}>Load more</Button>}
    </CardContent>
  </Card>;
}
