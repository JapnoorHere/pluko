'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,Download,MailPlus,Rocket,Search,Trash2} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,DataTable,EmptyState,PageHeader,RowActions,SearchInput,StatCard,StatGrid,StatGridSkeleton,TableToolbar,TimeAgo,toast,Callout} from '@/components/workspace/ui';
import {matches} from '@/lib/ui-helpers';
import {downloadText,waitlistToCsv} from '@/lib/display';
import {Button} from '@/components/ui/button';

const DAY=86400000;

export function AdminWaitlist(){
  const {call,href}=useWorkspace();
  const waitlist=useResource('/api/admin/waitlist');
  const settings=useResource('/api/admin/settings');
  const [query,setQuery]=useState(''),[removing,setRemoving]=useState(null);
  const data=waitlist.data,entries=data?.entries;
  const rows=useMemo(()=>entries?.filter(entry=>matches(entry,query,['email'])).map(entry=>({...entry,id:entry.email})),[entries,query]);
  const live=settings.data?.settings?.prelaunch_enabled==='true';
  const since=days=>entries?.filter(entry=>entry.created>Date.now()-days*DAY).length??0;
  const exportCsv=()=>{downloadText(`pluko-waitlist-${new Date().toISOString().slice(0,10)}.csv`,waitlistToCsv(entries),'text/csv');toast.success(`Downloaded ${entries.length.toLocaleString()} ${entries.length===1?'email':'emails'}`);};

  const columns=[
    {key:'email',header:'Email',cell:entry=><span className="font-medium break-all">{entry.email}</span>},
    {key:'created',header:'Joined',className:'text-muted-foreground whitespace-nowrap',cell:entry=><TimeAgo value={entry.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:entry=><RowActions items={[{label:'Remove from waitlist',icon:Trash2,destructive:true,onSelect:()=>setRemoving(entry)}]}/>},
  ];

  return <>
    <PageHeader title="Waitlist" description="People who asked to hear when Pluko opens, from the coming-soon page."
      actions={<Button type="button" variant="outline" disabled={!entries?.length} onClick={exportCsv}><Download/>Download CSV</Button>}/>

    {settings.data&&<Callout type={live?'note':'warning'} title={live?'Coming-soon mode is on':'Coming-soon mode is off'}>
      {live?'Visitors see the coming-soon page and can join this list. The API and customer workspace are closed.':'The full site is open, so nobody new can join this list right now.'}{' '}
      <Link className="underline underline-offset-2" href={href('settings')}>Change in Platform settings</Link>.
    </Callout>}

    {!data?<StatGridSkeleton count={3}/>:<StatGrid columns={3}>
      <StatCard label="On the waitlist" value={data.total.toLocaleString()} icon={MailPlus}/>
      <StatCard label="Last 7 days" value={since(7).toLocaleString()} icon={CalendarDays}/>
      <StatCard label="Last 24 hours" value={since(1).toLocaleString()} icon={Rocket}/>
    </StatGrid>}
    {data?.truncated&&<Callout type="note" title="Showing the newest entries">The list and CSV include the newest {entries.length.toLocaleString()} of {data.total.toLocaleString()} sign-ups.</Callout>}

    <DataTable columns={columns} rows={rows} loading={waitlist.loading} error={waitlist.error} onRetry={waitlist.reload} caption="Waitlist"
      toolbar={<TableToolbar><SearchInput value={query} onChange={setQuery} placeholder="Search by email…"/></TableToolbar>}
      empty={query?<EmptyState icon={Search} title="No matching emails" description="Try another search." action={<Button variant="outline" onClick={()=>setQuery('')}>Clear search</Button>}/>
        :<EmptyState icon={MailPlus} title="No one on the waitlist yet" description="Sign-ups from the coming-soon page appear here."/>}/>

    <ConfirmDialog open={Boolean(removing)} onOpenChange={open=>{if(!open)setRemoving(null);}}
      title={`Remove ${removing?.email}?`} description="They won’t get the launch email. Do this when someone asks to be taken off the list."
      confirmLabel="Remove" busyLabel="Removing…"
      onConfirm={async()=>{await call('/api/admin/waitlist/remove',{email:removing.email});toast.success('Removed from the waitlist');await waitlist.reload({quiet:true});}}/>
  </>;
}
