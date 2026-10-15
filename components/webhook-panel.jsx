'use client';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Field,FieldLabel,FieldDescription} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {StatusBadge} from '@/components/dashboard-primitives';
import {copyText,format} from '@/lib/display';
import {VERIFY_SNIPPET} from '@/lib/webhook-example';

export function WebhookDialog({project,call,toast,close,refresh}) {
  const [url,setUrl]=useState(project.webhook_url||''),[saved,setSaved]=useState(project.webhook_url||''),[secret,setSecret]=useState(null),[busy,setBusy]=useState(false),[rows,setRows]=useState();
  const loadDeliveries=useCallback(()=>call(`/api/webhooks/deliveries?project_id=${project.id}`).then(data=>setRows(data.deliveries)).catch(error=>toast(error.message)),[call,project.id,toast]);
  useEffect(()=>{loadDeliveries();},[loadDeliveries]);

  const save=async(rotate=false)=>{
    setBusy(true);
    try{
      const data=await call('/api/projects/webhook',{id:project.id,webhook_url:url.trim(),...(rotate?{rotate:true}:{})});
      setSaved(data.webhook_url);setSecret(data.webhook_secret);
      toast(rotate?'New signing secret created':'Webhook saved');
      await refresh();
    }catch(error){toast(error.message);}finally{setBusy(false);}
  };
  const remove=async()=>{
    setBusy(true);
    try{await call('/api/projects/webhook',{id:project.id,webhook_url:null});setSaved('');setUrl('');setSecret(null);toast('Webhook removed');await refresh();await loadDeliveries();}
    catch(error){toast(error.message);}finally{setBusy(false);}
  };
  const sendTest=async()=>{
    try{await call('/api/projects/webhook/test',{id:project.id});toast('Test event queued. It is sent within a few seconds.');setTimeout(loadDeliveries,3000);await loadDeliveries();}
    catch(error){toast(error.message);}
  };
  const retry=async id=>{try{await call('/api/webhooks/redeliver',{id});toast('Delivery queued again');await loadDeliveries();}catch(error){toast(error.message);}};
  const copy=async(label,value)=>toast(await copyText(value)?`${label} copied`:'Copy failed: select the text manually');

  return <div className="space-y-5">
    <h2>Webhook for {project.name}</h2>
    <p>Instead of polling, Pluko can send a signed <code>POST</code> to your server when a job finishes (complete, partial or cancelled). Your endpoint must use https, be publicly reachable, and answer with any 2xx status. Failed deliveries are retried up to 5 times with growing delays.</p>
    <form onSubmit={event=>{event.preventDefault();save(false);}} className="space-y-3">
      <Field><FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel><Input id="webhook-url" type="url" required placeholder="https://example.com/hooks/pluko" value={url} onChange={event=>setUrl(event.target.value)}/><FieldDescription>Public https address on port 443. Treat the URL as sensitive if it contains a token.</FieldDescription></Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy||!url.trim()||url.trim()===saved}>{busy?'Saving…':saved?'Update URL':'Save webhook'}</Button>
        {saved&&<><Button type="button" variant="outline" onClick={sendTest}>Send test event</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>save(true)}>Rotate secret</Button><Button type="button" variant="outline" disabled={busy} onClick={remove}>Remove webhook</Button></>}
      </div>
    </form>

    {secret&&<div className="space-y-2 rounded-lg border border-primary/40 p-4">
      <strong>Copy your signing secret now</strong>
      <p>It is shown only once. Use it to verify every request really came from Pluko.</p>
      <pre>{secret}</pre>
      <Button type="button" onClick={()=>copy('Signing secret',secret)}>Copy secret</Button>
    </div>}

    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">How to verify a request</summary>
      <div className="mt-3 space-y-2">
        <p>Each request has <code>Pluko-Signature: t=&lt;ms&gt;,v1=&lt;hex&gt;</code>, where <code>v1</code> is an HMAC-SHA256 of <code>"&lt;t&gt;.&lt;raw body&gt;"</code> using your secret. Also sent: <code>Pluko-Event</code> and <code>Pluko-Delivery</code> (unique per event; use it to ignore duplicates).</p>
        <pre>{VERIFY_SNIPPET}</pre>
        <Button type="button" variant="outline" size="sm" onClick={()=>copy('Example',VERIFY_SNIPPET)}>Copy example</Button>
      </div>
    </details>

    <div className="space-y-2">
      <div className="flex items-center justify-between"><strong>Recent deliveries</strong><Button type="button" variant="ghost" size="sm" onClick={loadDeliveries}>Refresh</Button></div>
      {!rows?<Skeleton className="h-20"/>:<div className="overflow-hidden rounded-md border"><Table>
        <TableHeader><TableRow>{['When','Event','Status','Tries','Response',''].map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {!rows.length&&<TableRow><TableCell colSpan={6} className="h-16 text-center text-muted-foreground">Nothing sent yet. Send a test event to try it.</TableCell></TableRow>}
          {rows.map(row=><TableRow key={row.id}>
            <TableCell>{format(row.created)}</TableCell><TableCell><code>{row.event}</code></TableCell><TableCell><StatusBadge status={row.status}/></TableCell><TableCell>{row.attempts}</TableCell>
            <TableCell className="max-w-56 truncate text-muted-foreground" title={row.last_error||''}>{row.status==='delivered'?`HTTP ${row.last_status}`:row.last_error||(row.status==='pending'?`Next try ${format(row.next_at)}`:'—')}</TableCell>
            <TableCell className="text-right">{row.status==='failed'&&<Button type="button" variant="outline" size="sm" onClick={()=>retry(row.id)}>Retry</Button>}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table></div>}
    </div>
    <Button type="button" variant="outline" onClick={close}>Close</Button>
  </div>;
}
