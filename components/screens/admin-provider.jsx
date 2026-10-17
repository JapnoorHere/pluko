'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,Ban,CheckCircle2,Clock,Plus,ShieldBan,Trash2} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,ConfirmDialog,DataTable,Duration,EmptyState,ErrorState,FormDialog,IdPill,PageHeader,RowActions,SearchInput,StatCard,StatusBadge,TableToolbar,TimeAgo,ToneBadge,toast,StatGrid} from '@/components/workspace/ui';
import {formatDuration,matches,percent,settingsPayload} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Card,CardAction,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Switch} from '@/components/ui/switch';

export function AdminProvider(){
  const {call,takeIntent}=useWorkspace();
  const settings=useResource('/api/admin/settings');
  const rules=useResource('/api/admin/rules');
  const attempts=useResource('/api/admin/attempts',{poll:20000});
  const [pausing,setPausing]=useState(false),[adding,setAdding]=useState(false),[removing,setRemoving]=useState(null),[query,setQuery]=useState('');
  const [domain,setDomain]=useState(''),[action,setAction]=useState('block'),[reason,setReason]=useState('');
  useEffect(()=>{if(takeIntent('provider','rule')){setDomain('');setReason('');setAction('block');setAdding(true);}},[takeIntent]);
  const enabled=settings.data?.settings.provider_enabled==='true';
  const setProvider=async on=>{await call('/api/admin/settings',settingsPayload(settings.data.settings,{provider_enabled:on}));toast.success(on?'Provider resumed':'Provider paused');await settings.reload({quiet:true});};

  const list=attempts.data?.attempts||[];
  const stats=useMemo(()=>{
    const ok=list.filter(item=>!item.error&&item.status!=='failed').length;
    const candidates=list.reduce((sum,item)=>sum+(item.candidates||0),0),accepted=list.reduce((sum,item)=>sum+(item.accepted||0),0);
    const avg=list.length?list.reduce((sum,item)=>sum+(item.duration||0),0)/list.length:0;
    return {success:percent(ok,list.length),acceptance:percent(accepted,candidates),avg};
  },[list]);
  const ruleRows=rules.data?.rules.filter(rule=>matches(rule,query,['domain','reason']));

  return <>
    <PageHeader title="Provider & rules" description="Control the image source, block or downrank domains, and watch provider health." actions={<Button type="button" onClick={()=>{setDomain('');setReason('');setAction('block');setAdding(true);}}><Plus/>Add source rule</Button>}/>

    {settings.error?<ErrorState error={settings.error} onRetry={settings.reload}/>:!settings.data?<CardSkeleton lines={1}/>:
    <Card className={enabled?undefined:'border-amber-500/40'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Image provider{enabled?<StatusBadge status="active" label="Running"/>:<ToneBadge tone="warning">Paused</ToneBadge>}</CardTitle>
        <CardDescription>{enabled?'New searches are sent to the image source as they arrive.':'Queued searches wait until you resume. Jobs, users and rules are kept.'}</CardDescription>
        <CardAction><Switch checked={enabled} aria-label="Image provider" onCheckedChange={on=>on?setProvider(true).catch(failure=>toast.error(failure.message)):setPausing(true)}/></CardAction>
      </CardHeader>
    </Card>}

    <StatGrid columns={3}>
      <StatCard label="Successful attempts" value={attempts.data?`${stats.success}%`:'—'} icon={CheckCircle2} hint={`Across the last ${list.length} provider pages`}/>
      <StatCard label="Candidates accepted" value={attempts.data?`${stats.acceptance}%`:'—'} icon={Activity} hint="After filters and source rules"/>
      <StatCard label="Avg. page time" value={attempts.data?formatDuration(stats.avg):'—'} icon={Clock} hint="Time per request to the source"/>
    </StatGrid>

    <section className="grid gap-3">
      <div><h2 className="text-base font-semibold tracking-tight">Source rules</h2><p className="text-sm text-muted-foreground">Blocked domains never appear in results. Downranked domains appear only when there’s nothing better.</p></div>
      <DataTable rows={ruleRows} loading={rules.loading} error={rules.error} onRetry={rules.reload} rowKey="domain" caption="Source rules"
        toolbar={rules.data?.rules.length>0&&<TableToolbar><SearchInput value={query} onChange={setQuery} placeholder="Search domains…"/></TableToolbar>}
        columns={[
          {key:'domain',header:'Domain',cell:rule=><code className="text-sm">{rule.domain}</code>},
          {key:'action',header:'Rule',cell:rule=><ToneBadge tone={rule.action==='block'?'danger':'warning'}>{rule.action==='block'?'Blocked':'Downranked'}</ToneBadge>},
          {key:'reason',header:'Reason',className:'max-w-0 w-full truncate text-muted-foreground',cell:rule=><span title={rule.reason}>{rule.reason}</span>},
          {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:rule=><RowActions items={[{label:'Remove rule',icon:Trash2,destructive:true,onSelect:()=>setRemoving(rule)}]}/>},
        ]}
        empty={<EmptyState icon={ShieldBan} title={query?'No matching rules':'No source rules yet'} description="Add a rule to block or downrank a domain, for example one that often serves watermarked images." action={!query&&<Button onClick={()=>setAdding(true)}><Plus/>Add source rule</Button>}/>}/>
    </section>

    <section className="grid gap-3">
      <div><h2 className="text-base font-semibold tracking-tight">Recent provider attempts</h2><p className="text-sm text-muted-foreground">One row per page requested from the source. Refreshes every 20 seconds.</p></div>
      <DataTable rows={attempts.data?.attempts} loading={attempts.loading} error={attempts.error} onRetry={attempts.reload} skeletonRows={6} caption="Provider attempts"
        columns={[
          {key:'created',header:'When',className:'text-muted-foreground',cell:item=><TimeAgo value={item.created}/>},
          {key:'job',header:'Job',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:item=><IdPill value={item.job_id}/>},
          {key:'status',header:'Status',cell:item=><StatusBadge status={item.error?'failed':item.status}/>},
          {key:'yield',header:'Accepted',headClassName:'text-right',className:'text-right tabular-nums',cell:item=><span>{item.accepted}<span className="text-muted-foreground"> / {item.candidates}</span></span>},
          {key:'duration',header:'Time',headClassName:'hidden sm:table-cell text-right',className:'hidden sm:table-cell text-right',cell:item=><Duration ms={item.duration}/>},
          {key:'error',header:'Error',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell max-w-64 truncate text-muted-foreground',cell:item=><span title={item.error||''}>{item.error||'—'}</span>},
        ]}
        empty={<EmptyState icon={Activity} title="No provider activity yet" description="Attempts appear here once the worker starts processing searches."/>}/>
    </section>

    <ConfirmDialog open={pausing} onOpenChange={setPausing} title="Pause the image provider?" description="No new pages are requested from the source. Queued and running jobs wait until you resume, and customers see that searches are paused." confirmLabel="Pause provider" busyLabel="Pausing…" onConfirm={()=>setProvider(false)}/>
    <FormDialog open={adding} onOpenChange={setAdding} title="Add a source rule" description="Applies to future results across every account." submitLabel="Add rule" busyLabel="Adding…"
      onSubmit={async()=>{await call('/api/admin/rules',{domain:domain.trim(),action,reason});toast.success(`Rule added for ${domain.trim()}`);await rules.reload({quiet:true});}}>
      <Field><FieldLabel htmlFor="rule-domain">Domain</FieldLabel><Input id="rule-domain" required autoFocus placeholder="example.com" className="font-mono" value={domain} onChange={event=>setDomain(event.target.value)}/></Field>
      <RadioGroup value={action} onValueChange={setAction} className="grid gap-2 sm:grid-cols-2">
        {[['block','Block','Never show results from this domain.',Ban],['downrank','Downrank','Show only when nothing better is found.',Activity]].map(([value,label,hint,Icon])=><Label key={value} htmlFor={`rule-${value}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-brand/50 has-[[data-state=checked]]:bg-brand/5">
          <RadioGroupItem id={`rule-${value}`} value={value} className="mt-0.5"/><span className="grid gap-0.5"><span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-3.5"/>{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
        </Label>)}
      </RadioGroup>
      <Field><FieldLabel htmlFor="rule-reason">Reason</FieldLabel><Input id="rule-reason" required maxLength={500} placeholder="Frequently watermarked" value={reason} onChange={event=>setReason(event.target.value)}/></Field>
    </FormDialog>
    <ConfirmDialog open={Boolean(removing)} onOpenChange={open=>{if(!open)setRemoving(null);}} title={`Remove the rule for ${removing?.domain}?`} description="Results from this domain will be allowed back into future searches." confirmLabel="Remove rule" busyLabel="Removing…"
      onConfirm={async()=>{await call('/api/admin/rules',{domain:removing.domain,action:'remove',reason:'Removed by administrator'});toast.success('Rule removed');await rules.reload({quiet:true});}}/>
  </>;
}
