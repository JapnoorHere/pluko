'use client';
import {useEffect,useMemo,useState} from 'react';
import {Archive,Database,Eraser,HardDrive,Rows3,Sparkles} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,ConfirmDialog,DataTable,ErrorState,PageHeader,SaveBar,StatCard,StatGridSkeleton,toast,StatGrid} from '@/components/workspace/ui';
import {compactNumber,settingsPayload} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {InputGroup,InputGroupAddon,InputGroupInput,InputGroupText} from '@/components/ui/input-group';
import {Spinner} from '@/components/ui/spinner';

const RETENTION=[
  ['body_days','Full request bodies','Request and response bodies are redacted after this.'],
  ['summary_days','Request summaries','Method, route, status and timing. Must be at least the body period.'],
  ['job_days','Jobs and result URLs','Finished jobs and their results. Running jobs are always kept.'],
  ['audit_days','Audit history','Administrator and account events.'],
];
const POLICIES={
  requests:s=>`Redacts request and response bodies older than ${s.body_days} days, then removes request summaries older than ${s.summary_days} days.`,
  attempts:s=>`Removes provider attempt logs older than ${s.summary_days} days.`,
  jobs:s=>`Removes completed jobs older than ${s.job_days} days, with their tasks and result URLs. Queued and running jobs are kept.`,
  audit:s=>`Removes audit records older than ${s.audit_days} days.`,
  feedback:s=>`Removes feedback older than ${s.summary_days} days.`,
  webhook_deliveries:s=>`Removes finished or failed webhook deliveries older than ${s.summary_days} days. Pending deliveries are kept.`,
  sessions:()=>'Removes expired login sessions only.',
  tokens:()=>'Removes expired invitation, reset and setup tokens only.',
  rate_limits:()=>'Removes expired rate-limit counters only.',
  usage:()=>'Removes usage records older than 365 days.',
};
const DEPENDENT=new Set(['tasks','results']);
const bytes=value=>value>=1048576?`${(value/1048576).toFixed(1)} MB`:value>=1024?`${Math.round(value/1024)} KB`:`${value} B`;

export function AdminStorage(){
  const {call}=useWorkspace();
  const settings=useResource('/api/admin/settings');
  const storage=useResource('/api/admin/storage');
  const [draft,setDraft]=useState(null),[saving,setSaving]=useState(false),[cleaning,setCleaning]=useState(null),[backingUp,setBackingUp]=useState(false);
  const stored=settings.data?.settings;
  useEffect(()=>{if(stored)setDraft(Object.fromEntries(RETENTION.map(([key])=>[key,stored[key]])));},[stored]);
  const dirty=stored&&draft&&RETENTION.some(([key])=>String(draft[key])!==String(stored[key]));
  const invalid=draft&&Number(draft.body_days)>Number(draft.summary_days);

  const save=async()=>{
    if(invalid){toast.error('Full bodies can’t be kept longer than request summaries.');return;}
    setSaving(true);
    try{await call('/api/admin/settings',settingsPayload(stored,draft));toast.success('Retention policy saved');await settings.reload({quiet:true});}
    catch(failure){toast.error(failure.message);}
    finally{setSaving(false);}
  };
  const backup=async()=>{
    setBackingUp(true);
    try{const data=await call('/api/admin/backup',{});toast.success(`Backup created: ${data.name}`);await storage.reload({quiet:true});}
    catch(failure){toast.error(failure.message);}
    finally{setBackingUp(false);}
  };
  const data=storage.data;
  const totals=useMemo(()=>data&&{records:data.tables.reduce((sum,item)=>sum+item.count,0),size:data.files.reduce((sum,item)=>sum+item.bytes,0)},[data]);
  const backups=data?[...data.backups].sort().reverse():[];

  return <>
    <PageHeader title="Storage & retention" description="Pluko stores metadata and operational logs, never downloaded image files. Retention runs automatically from the worker."
      actions={<><Button type="button" variant="outline" disabled={backingUp||!data} onClick={backup}>{backingUp?<Spinner/>:<Archive/>}Create backup</Button><Button type="button" variant="outline" disabled={!stored} onClick={()=>setCleaning('all')}><Sparkles/>Apply all cleanup</Button></>}/>
    {storage.error?<ErrorState error={storage.error} onRetry={storage.reload}/>:!data?<StatGridSkeleton count={3}/>:
    <StatGrid columns={3}>
      <StatCard label="Records" value={compactNumber(totals.records)} icon={Rows3} hint={`Across ${data.tables.length} tables`}/>
      <StatCard label="On disk" value={bytes(totals.size)} icon={HardDrive} hint={`${data.files.length} data files`}/>
      <StatCard label="Local backups" value={data.backups.length} icon={Archive} hint={backups[0]?`Latest ${backups[0]}`:'None yet'}/>
    </StatGrid>}

    {!draft?<CardSkeleton lines={2}/>:<Card>
      <CardHeader><CardTitle>Retention policy</CardTitle><CardDescription>How long each kind of record is kept, in days (1–3650).</CardDescription></CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {RETENTION.map(([key,label,hint])=><Field key={key}><FieldLabel htmlFor={`retention-${key}`}>{label}</FieldLabel>
          <InputGroup className="max-w-48"><InputGroupInput id={`retention-${key}`} type="number" min="1" max="3650" value={draft[key]} aria-invalid={key==='body_days'&&invalid} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/><InputGroupAddon align="inline-end"><InputGroupText>days</InputGroupText></InputGroupAddon></InputGroup>
          <FieldDescription className={key==='body_days'&&invalid?'text-destructive':undefined}>{key==='body_days'&&invalid?'Must not be longer than request summaries.':hint}</FieldDescription>
        </Field>)}
      </CardContent>
    </Card>}

    <section className="grid gap-3">
      <div><h2 className="text-base font-semibold tracking-tight">Tables</h2><p className="text-sm text-muted-foreground">Clean one table now instead of waiting for the next automatic run.</p></div>
      <DataTable rows={data?.tables} loading={storage.loading} error={null} rowKey="name" skeletonRows={8} caption="Database tables" empty={null}
        columns={[
          {key:'name',header:'Table',cell:table=><span className="flex items-center gap-2"><Database className="size-3.5 text-muted-foreground"/><code className="text-sm">{table.name}</code></span>},
          {key:'count',header:'Records',headClassName:'text-right',className:'text-right tabular-nums',cell:table=>table.count.toLocaleString()},
          {key:'policy',header:'Policy',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell max-w-0 w-full truncate text-muted-foreground',cell:table=>stored&&POLICIES[table.name]?<span title={POLICIES[table.name](stored)}>{POLICIES[table.name](stored)}</span>:DEPENDENT.has(table.name)?'Removed together with expired jobs.':'Kept. Not managed by retention.'},
          {key:'actions',header:<span className="sr-only">Actions</span>,className:'text-right',cell:table=>POLICIES[table.name]?<Button type="button" variant="outline" size="sm" disabled={!stored} onClick={()=>setCleaning(table.name)}><Eraser/>Clean</Button>:<span className="text-xs text-muted-foreground">{DEPENDENT.has(table.name)?'With jobs':'Kept'}</span>},
        ]}/>
    </section>

    {backups.length>0&&<Card><CardHeader><CardTitle>Backups</CardTitle><CardDescription>Stored on this server in the data folder. Copy them off the machine for real disaster recovery.</CardDescription></CardHeader>
      <CardContent><ul className="divide-y rounded-lg border">{backups.slice(0,10).map(name=><li key={name} className="flex items-center gap-3 px-4 py-2.5 text-sm"><Archive className="size-4 text-muted-foreground"/><code className="text-xs">{name}</code></li>)}</ul>{backups.length>10&&<p className="mt-2 text-xs text-muted-foreground">And {backups.length-10} older.</p>}</CardContent></Card>}

    <SaveBar dirty={dirty} busy={saving} onSave={save} onReset={()=>setDraft(Object.fromEntries(RETENTION.map(([key])=>[key,stored[key]])))} message="Retention policy has unsaved changes"/>
    <ConfirmDialog open={Boolean(cleaning)} onOpenChange={open=>{if(!open)setCleaning(null);}}
      title={cleaning==='all'?'Apply all retention cleanup?':`Clean the ${cleaning} table?`}
      description={cleaning==='all'?'Every retention rule runs now and permanently removes eligible old records. Users, projects and API keys are kept.':cleaning&&stored&&POLICIES[cleaning]?.(stored)}
      confirmLabel={cleaning==='all'?'Apply all cleanup':'Clean table'} busyLabel="Cleaning…"
      onConfirm={async()=>{await call('/api/admin/cleanup',cleaning==='all'?{}:{table:cleaning});toast.success(cleaning==='all'?'Retention cleanup finished':`Cleanup finished for ${cleaning}`);await storage.reload({quiet:true});}}/>
  </>;
}
