'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {CheckCheck,Flag,MessageSquareWarning} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {DataTable,EmptyState,IdPill,PageHeader,RowActions,StatusBadge,TableToolbar,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const REASONS={not_relevant:['Not relevant','neutral'],watermark:['Watermarked','warning'],broken:['Broken','danger'],other:['Other','info']};

export function Feedback(){
  const {me,call,href,navigate}=useWorkspace();
  const admin=me.role==='admin';
  const feedback=useResource('/api/feedback');
  const [tab,setTab]=useState('open');
  const all=feedback.data?.feedback;
  const rows=useMemo(()=>all?.filter(item=>tab==='all'||(tab==='open'?(item.status||'open')!=='reviewed':item.status==='reviewed')),[all,tab]);
  const review=async item=>{try{await call('/api/admin/feedback',{id:item.id});toast.success('Marked as reviewed');await feedback.reload({quiet:true});}catch(failure){toast.error(failure.message);}};

  const columns=[
    {key:'reason',header:'Report',className:'max-w-0 w-full',cell:item=>{const [label,tone]=REASONS[item.reason]||[item.reason,'neutral'];return <div className="grid min-w-0 gap-1"><ToneBadge tone={tone}>{label}</ToneBadge>{item.note&&<p className="truncate text-sm text-muted-foreground" title={item.note}>{item.note}</p>}</div>;}},
    {key:'job',header:'Job',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:item=><Link href={href('jobs',item.job_id)} onClick={event=>event.stopPropagation()} className="font-mono text-xs text-primary hover:underline">{item.job_id.slice(0,14)}…</Link>},
    {key:'result',header:'Result',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell',cell:item=><IdPill value={item.result_id}/>},
    {key:'status',header:'Status',cell:item=><StatusBadge status={item.status||'open'}/>},
    {key:'created',header:'Reported',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground',cell:item=><TimeAgo value={item.created}/>},
    ...(admin?[{key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:item=><RowActions items={[{label:'Open job',icon:Flag,onSelect:()=>navigate('jobs',item.job_id)},item.status!=='reviewed'&&{label:'Mark reviewed',icon:CheckCheck,onSelect:()=>review(item)}]}/>}]:[]),
  ];
  const openCount=all?.filter(item=>(item.status||'open')!=='reviewed').length;
  return <>
    <PageHeader title="Quality feedback" description={admin?'Reports from every account. Review them to tune source rules and ranking.':'Problems you reported on search results. Each report stays linked to its job and image.'}/>
    <DataTable columns={columns} rows={rows} loading={feedback.loading} error={feedback.error} onRetry={feedback.reload} caption="Quality feedback"
      toolbar={<TableToolbar><Tabs value={tab} onValueChange={setTab}><TabsList className="h-8"><TabsTrigger value="open" className="text-xs">Open{openCount!==undefined&&<span className="ml-1 text-muted-foreground tabular-nums">{openCount}</span>}</TabsTrigger><TabsTrigger value="reviewed" className="text-xs">Reviewed</TabsTrigger><TabsTrigger value="all" className="text-xs">All</TabsTrigger></TabsList></Tabs></TableToolbar>}
      empty={<EmptyState icon={MessageSquareWarning} title={tab==='open'?'Nothing waiting for review':'No reports here'} description="Open any search result and choose “Report a problem” to flag irrelevant, watermarked or broken images." action={<Button asChild variant="outline"><Link href={href('jobs')}>Go to search jobs</Link></Button>}/>}/>
  </>;
}
