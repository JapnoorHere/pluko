'use client';
import {useState} from 'react';
import Link from 'next/link';
import {CalendarDays,Download,MailPlus,Rocket,Trash2} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,DataTable,PageHeader,RowActions,StatCard,StatGrid,StatGridSkeleton,TimeAgo,toast,Callout} from '@/components/workspace/ui';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {downloadText,waitlistToCsv} from '@/lib/display';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';

const DEFAULTS={sort:'created_desc'};
const FILTERS=[{id:'created',label:'Joined',type:'date'}];

export function AdminWaitlist(){
  const {call,href}=useWorkspace();
  const list=useListQuery('/api/admin/waitlist',{id:'waitlist',itemsKey:'entries',filters:FILTERS,defaults:DEFAULTS});
  const stats=useResource('/api/admin/waitlist/stats');
  const settings=useResource('/api/admin/settings');
  const [removing,setRemoving]=useState(null),[exporting,setExporting]=useState(false);
  const totals=stats.data?.stats;
  const live=settings.data?.settings?.prelaunch_enabled==='true';
  const rows=list.items?.map(entry=>({...entry,id:entry.email}));

  // The export always covers the whole list (newest 10,000), not just the current page or filters.
  const exportCsv=async()=>{
    setExporting(true);
    try{
      const data=await call('/api/admin/waitlist');
      downloadText(`pluko-waitlist-${new Date().toISOString().slice(0,10)}.csv`,waitlistToCsv(data.entries),'text/csv');
      toast.success(`Downloaded ${data.entries.length.toLocaleString()} ${data.entries.length===1?'email':'emails'}${data.truncated?' (newest only)':''}`);
    }catch(failure){toast.error(failure.message);}
    finally{setExporting(false);}
  };

  const columns=[
    {key:'email',header:'Email',sortKey:'email',sortFirst:'asc',cell:entry=><span className="font-medium break-all">{entry.email}</span>},
    {key:'created',header:'Joined',sortKey:'created',className:'text-muted-foreground whitespace-nowrap',cell:entry=><TimeAgo value={entry.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:entry=><RowActions items={[{label:'Remove from waitlist',icon:Trash2,destructive:true,onSelect:()=>setRemoving(entry)}]}/>},
  ];

  return <>
    <PageHeader title="Waitlist" description="People who asked to hear when Pluko opens, from the coming-soon page."
      actions={<Button type="button" variant="outline" disabled={!totals?.total||exporting} onClick={exportCsv}>{exporting?<Spinner/>:<Download/>}Download CSV</Button>}/>

    {settings.data&&<Callout type={live?'note':'warning'} title={live?'Coming-soon mode is on':'Coming-soon mode is off'}>
      {live?'Visitors see the coming-soon page and can join this list. The API and customer workspace are closed.':'The full site is open, so nobody new can join this list right now.'}{' '}
      <Link className="underline underline-offset-2" href={href('settings')}>Change in Platform settings</Link>.
    </Callout>}

    {!totals?<StatGridSkeleton count={3}/>:<StatGrid columns={3}>
      <StatCard label="On the waitlist" value={totals.total.toLocaleString()} icon={MailPlus}/>
      <StatCard label="Last 7 days" value={totals.last_week.toLocaleString()} icon={CalendarDays}/>
      <StatCard label="Last 24 hours" value={totals.last_day.toLocaleString()} icon={Rocket}/>
    </StatGrid>}

    <DataTable columns={columns} rows={rows} loading={list.loading} error={list.error} onRetry={()=>list.reload()} caption="Waitlist"
      sort={list.sort} onSort={list.setSort}
      toolbar={<FilterBar list={list} placeholder="Search by email…"/>}
      empty={<ListEmpty list={list} icon={MailPlus} title="No one on the waitlist yet" description="Sign-ups from the coming-soon page appear here."/>}
      footer={<Pagination list={list} label="sign-ups"/>}/>

    <ConfirmDialog open={Boolean(removing)} onOpenChange={open=>{if(!open)setRemoving(null);}}
      title={`Remove ${removing?.email}?`} description="They won’t get the launch email. Do this when someone asks to be taken off the list."
      confirmLabel="Remove" busyLabel="Removing…"
      onConfirm={async()=>{await call('/api/admin/waitlist/remove',{email:removing.email});toast.success('Removed from the waitlist');await Promise.all([list.reload({quiet:true}),stats.reload({quiet:true})]);}}/>
  </>;
}
