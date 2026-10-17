'use client';
import {useEffect,useState} from 'react';
import {RefreshCw,RotateCw,Send,Trash2,Webhook} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CodeBlock,ConfirmDialog,EmptyState,InlineError,SecretReveal,StatusBadge,TimeAgo,toast,Card,CardAction,CardContent,CardDescription,CardFooter,CardHeader,CardTitle,ErrorState,TableSkeleton} from '@/components/workspace/ui';
import {VERIFY_SNIPPET} from '@/lib/webhook-example';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Collapsible,CollapsibleContent,CollapsibleTrigger} from '@/components/ui/collapsible';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';

export function WebhookSettings({project,refresh}){
  const {call}=useWorkspace();
  const [url,setUrl]=useState(project.webhook_url||''),[saved,setSaved]=useState(project.webhook_url||''),[secret,setSecret]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null),[confirm,setConfirm]=useState(null);
  const deliveries=useResource(`/api/webhooks/deliveries?project_id=${project.id}`,{poll:saved?10000:0});
  useEffect(()=>{setUrl(project.webhook_url||'');setSaved(project.webhook_url||'');},[project.webhook_url]);

  const save=async(rotate=false)=>{
    setBusy(true);setError(null);
    try{
      const data=await call('/api/projects/webhook',{id:project.id,webhook_url:url.trim(),...(rotate?{rotate:true}:{})});
      setSaved(data.webhook_url);setSecret(data.webhook_secret||null);
      toast.success(rotate?'New signing secret created':'Webhook saved');
      await refresh();
    }catch(failure){setError(failure);if(rotate)throw failure;}
    finally{setBusy(false);}
  };
  const remove=async()=>{
    await call('/api/projects/webhook',{id:project.id,webhook_url:null});
    setSaved('');setUrl('');setSecret(null);toast.success('Webhook removed');
    await refresh();await deliveries.reload({quiet:true});
  };
  const sendTest=async()=>{
    try{await call('/api/projects/webhook/test',{id:project.id});toast.success('Test event queued. It’s sent within a few seconds.');setTimeout(()=>deliveries.reload({quiet:true}),3000);}
    catch(failure){toast.error(failure.message);}
  };
  const retry=async id=>{try{await call('/api/webhooks/redeliver',{id});toast.success('Delivery queued again');await deliveries.reload({quiet:true});}catch(failure){toast.error(failure.message);}};


  return <div className="grid gap-6">
    <Card>
      <CardHeader><CardTitle>Endpoint</CardTitle><CardDescription>Pluko sends a signed <code>POST</code> when a job finishes (complete, partial or cancelled). Failed deliveries are retried up to 5 times with growing delays.</CardDescription>
        {saved&&<CardAction><StatusBadge status="active" label="Configured"/></CardAction>}</CardHeader>
      <CardContent>
        <form id="webhook-form" onSubmit={event=>{event.preventDefault();save(false);}} className="grid gap-4">
          <Field><FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel><Input id="webhook-url" type="url" required placeholder="https://api.example.com/hooks/pluko" className="font-mono text-sm" value={url} onChange={event=>setUrl(event.target.value)}/><FieldDescription>Must be a public https address on port 443 that answers with any 2xx status. Treat it as sensitive if it contains a token.</FieldDescription></Field>
          <InlineError error={error}/>
        </form>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">{saved&&<><Button type="button" variant="outline" size="sm" onClick={sendTest}><Send/>Send test event</Button><Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>setConfirm('rotate')}><RotateCw/>Rotate secret</Button><Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={()=>setConfirm('remove')}><Trash2/>Remove</Button></>}</div>
        <Button type="submit" form="webhook-form" size="sm" disabled={busy||!url.trim()||url.trim()===saved}>{busy&&<Spinner/>}{busy?'Saving…':saved?'Update URL':'Save webhook'}</Button>
      </CardFooter>
    </Card>

    {secret&&<Card className="border-amber-500/30"><CardHeader><CardTitle>Signing secret</CardTitle><CardDescription>Use it to verify that each request really came from Pluko.</CardDescription></CardHeader><CardContent><SecretReveal secret={secret} label="Signing secret" warning="It’s shown only once. If you lose it, rotate the secret." onDone={()=>setSecret(null)} doneLabel="Hide secret"/></CardContent></Card>}

    <Collapsible className="rounded-xl border">
      <CollapsibleTrigger asChild><button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium"><span>How to verify a request</span><span className="text-xs font-normal text-muted-foreground">Node.js example</span></button></CollapsibleTrigger>
      <CollapsibleContent className="grid gap-3 border-t p-4 text-sm text-muted-foreground">
        <p>Each request has a <code>Pluko-Signature: t=&lt;ms&gt;,v1=&lt;hex&gt;</code> header, where <code>v1</code> is an HMAC-SHA256 of <code>"&lt;t&gt;.&lt;raw body&gt;"</code> using your secret. <code>Pluko-Delivery</code> is unique per event, so use it to ignore duplicates.</p>
        <CodeBlock title="verify.js" language="javascript" code={VERIFY_SNIPPET}/>
      </CollapsibleContent>
    </Collapsible>

    <section className="grid gap-3">
      <div className="flex items-center justify-between"><div><h3 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.03em]">Recent deliveries</h3><p className="text-sm text-muted-foreground">The last attempts to reach your endpoint.</p></div><Button type="button" variant="outline" size="sm" onClick={()=>deliveries.reload()}><RefreshCw className={deliveries.loading?'animate-spin':undefined}/>Refresh</Button></div>
      {deliveries.error&&!deliveries.data?<ErrorState error={deliveries.error} onRetry={deliveries.reload} title="Couldn’t load deliveries"/>
      :!deliveries.data?<TableSkeleton rows={3} columns={3}/>
      :!deliveries.data.deliveries.length?<EmptyState icon={Webhook} title="Nothing sent yet" description={saved?'Send a test event to check your endpoint.':'Save an endpoint URL to start receiving events.'} action={saved&&<Button size="sm" variant="outline" className="rounded-full" onClick={sendTest}><Send/>Send test event</Button>}/>
      // A timeline of delivery attempts, newest first.
      :<ol className="relative grid gap-0 rounded-2xl border bg-card px-5 py-2" aria-label="Webhook deliveries">
        {deliveries.data.deliveries.map((row,index)=>{
          const tone=row.status==='delivered'?'bg-emerald-500':row.status==='failed'?'bg-destructive':'bg-amber-500';
          return <li key={row.id} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
            {index<deliveries.data.deliveries.length-1&&<span className="absolute top-7 bottom-0 left-[0.55rem] w-px bg-border" aria-hidden/>}
            <span className={cn('mt-1.5 size-2.5 rounded-full ring-4 ring-card',tone)} aria-hidden/>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm"><code className="font-mono text-[13px] font-medium">{row.event}</code><StatusBadge status={row.status}/></p>
                <p className="mt-1 truncate text-xs text-muted-foreground" title={row.last_error||''}>{row.status==='delivered'?`HTTP ${row.last_status}`:row.last_error||(row.status==='pending'?'Waiting to send':'—')} · {row.attempts} {row.attempts===1?'try':'tries'}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><TimeAgo value={row.created}/>{row.status==='failed'&&<Button type="button" variant="outline" size="sm" className="rounded-full" onClick={()=>retry(row.id)}>Retry</Button>}</div>
            </div>
          </li>;
        })}
      </ol>}
    </section>

    <ConfirmDialog open={confirm==='rotate'} onOpenChange={open=>{if(!open)setConfirm(null);}} destructive={false} title="Rotate the signing secret?" description="A new secret is created and the old one stops being used right away. Update your server before the next job finishes." confirmLabel="Rotate secret" busyLabel="Rotating…" onConfirm={()=>save(true)}/>
    <ConfirmDialog open={confirm==='remove'} onOpenChange={open=>{if(!open)setConfirm(null);}} title="Remove this webhook?" description="Pluko stops sending events to this project. You can add an endpoint again at any time." confirmLabel="Remove webhook" busyLabel="Removing…" onConfirm={remove}/>
  </div>;
}
