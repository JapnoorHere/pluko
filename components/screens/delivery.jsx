'use client';
import {useEffect,useState} from 'react';
import {Hourglass,ListChecks,Webhook} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CodeBlock,InfoDialog,InlineError,SecretReveal,ToneBadge,toast,Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/workspace/ui';
import {WebhookSettings} from '@/components/screens/webhook-settings';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Spinner} from '@/components/ui/spinner';

/** The three ways a project's app can receive results. Keys match the API's `delivery` values. */
export const DELIVERY={
  poll:{
    label:'Check back for results',icon:ListChecks,
    summary:'Pluko replies straight away with a job ID. Your app checks the job until it’s finished, then reads the images.',
    best:'Best for large searches and batch jobs.',
  },
  wait:{
    label:'Wait for results',icon:Hourglass,
    summary:'The search request stays open until the images are ready, then returns them in the same response. If a search takes longer than your limit, you get a job ID to check instead.',
    best:'Best for small searches someone is waiting on.',
  },
  webhook:{
    label:'Send results to a webhook',icon:Webhook,
    summary:'Pluko replies straight away, then sends a signed request to your server the moment the job finishes.',
    best:'Best when your backend shouldn’t wait or check back.',
  },
};
export const WAIT_CHOICES=[3,5,10];
const ORDER=['poll','wait','webhook'];

/** A short label for lists: "Check back", "Waits up to 10 s" or "Webhook". */
export function deliveryLabel(project){
  if(project.delivery==='wait')return `Waits up to ${project.wait_seconds} s`;
  if(project.delivery==='webhook')return 'Webhook';
  return 'Check back';
}
export function DeliveryBadge({project,className}){
  const Icon=DELIVERY[project.delivery]?.icon||ListChecks;
  return <ToneBadge tone={project.delivery==='poll'?'neutral':'info'} className={cn('normal-case',className)}><Icon className="size-3" aria-hidden/>{deliveryLabel(project)}</ToneBadge>;
}

/**
 * Radio cards for choosing how results are delivered, with the wait limit or webhook URL under the chosen card.
 * `needsUrl` shows the URL field for webhook (when the project has no URL saved yet).
 */
export function DeliveryChooser({value,onChange,waitSeconds,onWaitSeconds,webhookUrl,onWebhookUrl,needsUrl=true,idPrefix='delivery'}){
  return <RadioGroup value={value} onValueChange={onChange} className="grid gap-2" aria-label="How your app gets results">
    {ORDER.map(mode=>{
      const {label,icon:Icon,summary,best}=DELIVERY[mode],selected=value===mode,id=`${idPrefix}-${mode}`;
      return <div key={mode} className={cn('rounded-xl border transition-colors',selected&&'border-brand/50 bg-brand/5')}>
        <Label htmlFor={id} className="flex cursor-pointer items-start gap-3 p-3.5 font-normal">
          <RadioGroupItem id={id} value={mode} className="mt-0.5"/>
          <span className="grid gap-1">
            <span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden/>{label}{mode==='poll'&&<span className="font-normal text-muted-foreground">· default</span>}</span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">{summary}</span>
            <span className="text-xs text-muted-foreground/80">{best}</span>
          </span>
        </Label>
        {selected&&mode==='wait'&&<div className="border-t px-3.5 py-3 pl-10">
          <Field orientation="horizontal" className="items-center gap-3">
            <FieldLabel htmlFor={`${idPrefix}-wait-seconds`} className="text-sm font-normal whitespace-nowrap">Wait up to</FieldLabel>
            <Select value={String(waitSeconds)} onValueChange={next=>onWaitSeconds(Number(next))}>
              <SelectTrigger id={`${idPrefix}-wait-seconds`} size="sm" className="w-32"><SelectValue/></SelectTrigger>
              <SelectContent>{WAIT_CHOICES.map(seconds=><SelectItem key={seconds} value={String(seconds)}>{seconds} seconds</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <p className="mt-2 text-xs text-muted-foreground">Most small searches finish within a few seconds.</p>
        </div>}
        {selected&&mode==='webhook'&&needsUrl&&<div className="border-t px-3.5 py-3 pl-10">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-webhook-url`}>Webhook URL</FieldLabel>
            <Input id={`${idPrefix}-webhook-url`} type="url" required inputMode="url" placeholder="https://your-app.com/pluko-webhook" className="font-mono text-sm" value={webhookUrl} onChange={event=>onWebhookUrl(event.target.value)}/>
            <FieldDescription>An HTTPS address on your server. You’ll get a signing secret to verify each request.</FieldDescription>
          </Field>
        </div>}
      </div>;
    })}
  </RadioGroup>;
}

/** Shows a new webhook signing secret once. */
export function SigningSecretDialog({secret,onClose}){
  return <InfoDialog open={Boolean(secret)} onOpenChange={open=>{if(!open)onClose();}} dismissible={false} title="Save your signing secret" description="Use it to check that webhook requests really come from Pluko. It’s shown only once.">
    {secret&&<SecretReveal secret={secret} label="Signing secret" warning="Store it with your server’s other secrets. You can rotate it later from the Delivery tab." onDone={onClose}/>}
  </InfoDialog>;
}

const origin=()=>typeof window==='undefined'?'':window.location.origin;

/** How to call Pluko in the project's chosen mode. */
function DeliveryGuide({project}){
  if(project.delivery==='wait')return <Card>
    <CardHeader><CardTitle>Using wait mode</CardTitle><CardDescription>Search as usual. If the job finishes within {project.wait_seconds} seconds, the response is <code>200</code> and includes the images. If it’s still running, you get <code>202</code> with a job ID, and can wait on it again.</CardDescription></CardHeader>
    <CardContent className="grid gap-4">
      <CodeBlock title="Search and wait" language="bash" code={`curl -X POST ${origin()}/v1/images/search \\\n  -H "Authorization: Bearer $PLUKO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "query": "mountain landscape", "count": "20" }'\n\n# Finished in time: 200 with "status" and "images" (up to 100, then "next_cursor")\n# Still running:    202 with "job_id" — then wait on it:\ncurl "${origin()}/v1/jobs/JOB_ID?wait=10" -H "Authorization: Bearer $PLUKO_API_KEY"`}/>
      <p className="text-sm text-muted-foreground">To skip waiting for one request, send <code>Prefer: respond-async</code>.</p>
    </CardContent>
  </Card>;
  return <Card>
    <CardHeader><CardTitle>Checking back for results</CardTitle><CardDescription>Create the job, then ask for its status until it’s finished. Adding <code>?wait=10</code> makes each check wait up to 10 seconds for the job to finish, so you need far fewer requests.</CardDescription></CardHeader>
    <CardContent><CodeBlock title="Create a job and check back" language="javascript" code={`const headers = { Authorization: \`Bearer \${process.env.PLUKO_API_KEY}\`, 'Content-Type': 'application/json' };
const created = await fetch('${origin()}/v1/images/search', {
  method: 'POST', headers, body: JSON.stringify({ query: 'mountain landscape', count: '20' }),
}).then((r) => r.json());

let job;
do {
  job = (await fetch(\`${origin()}/v1/jobs/\${created.job_id}?wait=10\`, { headers }).then((r) => r.json())).job;
} while (job.status === 'queued' || job.status === 'running');

const { images } = await fetch(\`${origin()}/v1/jobs/\${created.job_id}/results?limit=100\`, { headers }).then((r) => r.json());`}/></CardContent>
  </Card>;
}

/** The project's Delivery tab: choose the mode, then see how to use it (or manage the webhook). */
export function DeliverySettings({project,refresh}){
  const {call}=useWorkspace();
  const [mode,setMode]=useState(project.delivery),[wait,setWait]=useState(project.wait_seconds),[url,setUrl]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(null),[secret,setSecret]=useState(null);
  useEffect(()=>{setMode(project.delivery);setWait(project.wait_seconds);},[project.delivery,project.wait_seconds]);
  const needsUrl=mode==='webhook'&&!project.webhook_url;
  const changed=mode!==project.delivery||(mode==='wait'&&wait!==project.wait_seconds);
  const save=async event=>{
    event.preventDefault();
    setBusy(true);setError(null);
    try{
      const data=await call('/api/projects/delivery',{id:project.id,delivery:mode,wait_seconds:wait,...(needsUrl?{webhook_url:url.trim()}:{})});
      if(data.webhook_secret)setSecret(data.webhook_secret);
      toast.success(`Now: ${DELIVERY[data.delivery].label.toLowerCase()}`);
      setUrl('');
      await refresh();
    }catch(failure){setError(failure);}
    finally{setBusy(false);}
  };
  return <div className="grid gap-6">
    <form onSubmit={save}>
      <Card>
        <CardHeader><CardTitle>How your app gets results</CardTitle><CardDescription>Choose how searches made with this project’s keys return their images. You can change this at any time; it applies to new searches.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <DeliveryChooser value={mode} onChange={setMode} waitSeconds={wait} onWaitSeconds={setWait} webhookUrl={url} onWebhookUrl={setUrl} needsUrl={needsUrl} idPrefix="project-delivery"/>
          {error&&<InlineError error={error}/>}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {changed&&<Button type="button" variant="ghost" onClick={()=>{setMode(project.delivery);setWait(project.wait_seconds);setError(null);}}>Cancel</Button>}
          <Button type="submit" disabled={!changed||busy||(needsUrl&&!url.trim())}>{busy&&<Spinner/>}{busy?'Saving…':'Save'}</Button>
        </CardFooter>
      </Card>
    </form>
    {project.delivery==='webhook'?<WebhookSettings project={project} refresh={refresh}/>:<DeliveryGuide project={project}/>}
    <SigningSecretDialog secret={secret} onClose={()=>setSecret(null)}/>
  </div>;
}
