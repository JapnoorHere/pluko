'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {CheckCheck,ExternalLink,MessageSquareWarning} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {EmptyState,ErrorState,IdPill,PageHeader,RowActions,Shimmer,StatusBadge,TableToolbar,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {ResultImage} from '@/components/screens/job-results';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const REASONS={not_relevant:['Not relevant','neutral'],watermark:['Watermarked','warning'],broken:['Broken','danger'],other:['Other','info']};

// One report as a card: the reported image, why it was reported, and where it came from.
function ReportCard({item,admin,onReview}){
  const {href,navigate}=useWorkspace();
  const [label,tone]=REASONS[item.reason]||[item.reason,'neutral'];
  const status=item.status||'open';
  return <li className="flex flex-col overflow-hidden rounded-2xl border bg-card">
    <div className="relative bg-muted">
      {item.image
        ?<a href={item.image.image_url||item.image.thumbnail_url} target="_blank" rel="noopener noreferrer" aria-label={`Open the reported image${item.image.title?`: ${item.image.title}`:''}`}><ResultImage image={item.image} className="aspect-[16/10] w-full object-cover"/></a>
        :<div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 px-6 text-center text-xs text-muted-foreground"><span className="font-medium">Image no longer kept</span><span>Retention removed this result; the report stays.</span></div>}
      <span className="absolute top-3 left-3"><ToneBadge tone={tone} className="bg-card/90 backdrop-blur">{label}</ToneBadge></span>
    </div>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.image?.title||item.image?.source_domain||'Search result'}</p>
          {item.image?.source_domain&&<p className="truncate text-xs text-muted-foreground">{item.image.source_domain}</p>}
        </div>
        <RowActions items={[
          {label:'Open job',icon:ExternalLink,onSelect:()=>navigate('jobs',item.job_id)},
          admin&&status!=='reviewed'&&{label:'Mark reviewed',icon:CheckCheck,onSelect:()=>onReview(item)},
        ]}/>
      </div>
      {item.note?<p className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-relaxed">“{item.note}”</p>:<p className="text-sm text-muted-foreground">No note added.</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Link href={href('jobs',item.job_id)} className="font-mono text-brand hover:underline">{item.job_id.slice(0,14)}…</Link>
        <span className="flex items-center gap-2"><StatusBadge status={status}/><TimeAgo value={item.created}/></span>
      </div>
      {admin&&<div className="text-xs text-muted-foreground">Result <IdPill value={item.result_id}/></div>}
    </div>
  </li>;
}

export function Feedback(){
  const {me,call,href}=useWorkspace();
  const admin=me.role==='admin';
  const feedback=useResource('/api/feedback');
  const [tab,setTab]=useState('open');
  const all=feedback.data?.feedback;
  const rows=useMemo(()=>all?.filter(item=>tab==='all'||(tab==='open'?(item.status||'open')!=='reviewed':item.status==='reviewed')),[all,tab]);
  const review=async item=>{try{await call('/api/admin/feedback',{id:item.id});toast.success('Marked as reviewed');await feedback.reload({quiet:true});}catch(failure){toast.error(failure.message);}};
  const openCount=all?.filter(item=>(item.status||'open')!=='reviewed').length;
  return <>
    <PageHeader title="Quality feedback" description={admin?'Reports from every account. Review them to tune source rules and ranking.':'Problems you reported on search results. Each report stays linked to its job and image.'}/>
    <div className="grid gap-4">
      <TableToolbar><Tabs value={tab} onValueChange={setTab}><TabsList className="h-8"><TabsTrigger value="open" className="text-xs">Open{openCount!==undefined&&<span className="ml-1 text-muted-foreground tabular-nums">{openCount}</span>}</TabsTrigger><TabsTrigger value="reviewed" className="text-xs">Reviewed</TabsTrigger><TabsTrigger value="all" className="text-xs">All</TabsTrigger></TabsList></Tabs></TableToolbar>
      {feedback.error&&!all?<ErrorState error={feedback.error} onRetry={feedback.reload} title="Couldn’t load feedback"/>
      :!all?<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[1,2,3].map(index=><li key={index} className="overflow-hidden rounded-2xl border bg-card"><Shimmer className="aspect-[16/10] w-full rounded-none"/><div className="grid gap-2 p-4"><Shimmer className="h-4 w-2/3"/><Shimmer className="h-10 w-full rounded-xl"/></div></li>)}</ul>
      :!rows.length?<EmptyState icon={MessageSquareWarning} title={tab==='open'?'Nothing waiting for review':'No reports here'} description="Open any search result and choose “Report a problem” to flag irrelevant, watermarked or broken images." action={<Button asChild variant="outline" className="rounded-full"><Link href={href('jobs')}>Go to search jobs</Link></Button>}/>
      :<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Feedback reports">{rows.map(item=><ReportCard key={item.id} item={item} admin={admin} onReview={review}/>)}</ul>}
    </div>
  </>;
}
