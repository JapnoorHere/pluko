'use client';
import {useMemo} from 'react';
import Link from 'next/link';
import {CheckCheck,ExternalLink,MessageSquareWarning} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {useOwnedOptions} from '@/components/screens/jobs';
import {cn} from '@/lib/utils';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {EmptyState,ErrorState,IdPill,PageHeader,RowActions,Shimmer,StatusBadge,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {ResultImage} from '@/components/screens/job-results';
import {Button} from '@/components/ui/button';

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
      {item.project_name&&<div className="truncate text-xs text-muted-foreground">Project · {item.project_name}</div>}
      {admin&&<div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{item.user_email&&<Link href={href('users',item.user_id)} className="truncate hover:text-foreground hover:underline">{item.user_email}</Link>}<span>Result <IdPill value={item.result_id}/></span></div>}
    </div>
  </li>;
}

const DEFAULTS={sort:'created_desc',filters:{status:'open'}};
const REASON_OPTIONS=Object.entries(REASONS).map(([value,[label]])=>[value,label]);

export function Feedback(){
  const {me,call,href}=useWorkspace();
  const admin=me.role==='admin';
  const {projects}=useOwnedOptions();
  const filters=useMemo(()=>[
    {id:'status',label:'Status',type:'select',anyLabel:'Open and reviewed',options:[['open','Open'],['reviewed','Reviewed']]},
    {id:'reason',label:'Reason',type:'multi',options:REASON_OPTIONS},
    {id:'project_id',label:'Project',type:'select',anyLabel:'Any project',options:projects.map(p=>[p.id,admin?`${p.name} · ${p.owner}`:p.name])},
    {id:'created',label:'Reported',type:'date'},
  ],[projects,admin]);
  const list=useListQuery('/api/feedback',{id:'feedback',itemsKey:'feedback',filters,defaults:DEFAULTS});
  const rows=list.items;
  const review=async item=>{try{await call('/api/admin/feedback',{id:item.id});toast.success('Marked as reviewed');await list.reload({quiet:true});}catch(failure){toast.error(failure.message);}};
  return <>
    <PageHeader title="Quality feedback" description={admin?'Reports from every account. Review them to tune source rules and ranking.':'Problems you reported on search results. Each report stays linked to its job and image.'}/>
    <div className="grid gap-4">
      <FilterBar list={list} placeholder="Search notes, sites or job IDs…" end={
        <Select value={list.sort} onValueChange={list.setSort}><SelectTrigger size="sm" className="w-36" aria-label="Order"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="created_desc">Newest first</SelectItem><SelectItem value="created_asc">Oldest first</SelectItem></SelectContent></Select>}/>
      {list.error&&!rows?<ErrorState error={list.error} onRetry={()=>list.reload()} title="Couldn’t load feedback"/>
      :!rows?<ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]" aria-busy="true">{[1,2,3].map(index=><li key={index} className="overflow-hidden rounded-2xl border bg-card"><Shimmer className="aspect-[16/10] w-full rounded-none"/><div className="grid gap-2 p-4"><Shimmer className="h-4 w-2/3"/><Shimmer className="h-10 w-full rounded-xl"/></div></li>)}</ul>
      :!rows.length?(list.filters.status==='open'&&list.activeCount===1&&!list.state.q.trim()
        ?<EmptyState icon={MessageSquareWarning} title="Nothing waiting for review" description="Open any search result and choose “Report a problem” to flag irrelevant, watermarked or broken images." action={<Button asChild variant="outline" className="rounded-full"><Link href={href('jobs')}>Go to search jobs</Link></Button>}/>
        :<ListEmpty list={list} icon={MessageSquareWarning} title="No reports yet" description="Open any search result and choose “Report a problem” to flag irrelevant, watermarked or broken images."/>)
      :<ul className={cn('grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]',list.loading&&'opacity-60 transition-opacity')} aria-label="Feedback reports">{rows.map(item=><ReportCard key={item.id} item={item} admin={admin} onReview={review}/>)}</ul>}
      {rows?.length>0&&<Pagination list={list} label="reports"/>}
    </div>
  </>;
}
