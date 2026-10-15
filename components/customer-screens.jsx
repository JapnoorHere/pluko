'use client';
import {useCallback,useEffect,useState} from 'react';
import {Activity,ArrowUpRight,ShieldCheck,FolderPlus,KeyRound,Search,Clock,RefreshCw} from 'lucide-react';
import {Toggle,ConfirmAction,StatusBadge} from '@/components/dashboard-primitives';
import {JobDetail} from '@/components/job-results';
import {UsagePanel} from '@/components/usage-panel';
export {Projects} from '@/components/project-panels';
export {Keys} from '@/components/key-panels';
export {Account} from '@/components/account-screen';
export {Playground} from '@/components/playground';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter,CardAction} from '@/components/ui/card';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Alert,AlertTitle,AlertDescription} from '@/components/ui/alert';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Skeleton} from '@/components/ui/skeleton';
import {format,short} from '@/lib/display';

export {StatusBadge};
function Logo(){return <div className="brand"><span className="logoMark"><img src="/logo.svg" alt="Pluko"/></span><span>pluko</span><i>beta</i></div>;}

export function Auth({call,onAuthenticated,toast,adminOnly=false}){
  const [mode,setMode]=useState('login'),[acceptToken,setAcceptToken]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const token=new URLSearchParams(window.location.hash.slice(1)).get('accept');if(token){setAcceptToken(token);setMode('accept');}else if(!adminOnly&&new URLSearchParams(window.location.search).get('mode')==='register'){setMode('register');}},[]);
  const submit=async event=>{event.preventDefault();setBusy(true);try{if(mode==='accept'){await call('/api/accept',{token:acceptToken,password});window.history.replaceState(null,'',window.location.pathname);setAcceptToken('');setPassword('');setMode('login');toast('Password saved. Sign in to continue.');}else if(mode==='register'){await call('/api/register',{email,password});toast('Account created. Your workspace is ready.');await onAuthenticated();}else{await call('/api/login',{email,password,code,...(adminOnly?{portal:'admin'}:{})});toast('Signed in.');await onAuthenticated();}}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <main className="auth"><section className="authIntro"><Logo/><span className="pill">Built for image-powered products</span><h1>Good images,<br/><em>on demand.</em></h1><p>Source-aware image search for whatever you are building.</p><div className="trustRow"><span><ShieldCheck size={16}/>Metadata only</span><span><Activity size={16}/>Async at scale</span></div></section><Card className="w-full" ><CardHeader><CardTitle>{mode==='accept'?'Set your password':mode==='register'?'Create your Pluko account':adminOnly?'Administrator sign in':'Welcome back'}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{mode==='accept'?'Choose a password to accept your invitation or reset your account.':mode==='register'?'Create your own workspace, projects, and API keys.':adminOnly?'Sign in with your administrator account.':'Sign in to manage your image search workspace.'}</p><form onSubmit={submit}>{mode!=='accept'&&<Field><FieldLabel htmlFor={'customer-field-1'}>Email</FieldLabel><Input id={'customer-field-1'} required type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={event=>setEmail(event.target.value)}/></Field>}<Field><FieldLabel htmlFor={'customer-field-2'}>Password (12+ characters)</FieldLabel><Input id={'customer-field-2'} required minLength={12} type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={event=>setPassword(event.target.value)}/></Field>{mode==='login'&&<Field><FieldLabel htmlFor={'customer-field-3'}>Authenticator code <span className="fieldOptional">optional</span></FieldLabel><Input id={'customer-field-3'} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={event=>setCode(event.target.value)}/></Field>}<Button type="submit" disabled={busy} className="submitButton">{busy?'Please wait…':mode==='accept'?'Save password':mode==='register'?'Create account':'Sign in'}<ArrowUpRight size={17}/></Button></form>{!adminOnly&&mode!=='accept'&&<p className="muted">{mode==='register'?<>Already have an account? <Button type="button" variant="link" className="authLink" onClick={()=>setMode('login')}>Sign in</Button></>:<>New here? <Button type="button" variant="link" className="authLink" onClick={()=>setMode('register')}>Create an account</Button></>}</p>}</CardContent></Card><p className="text-center text-xs text-muted-foreground"><a className="text-primary hover:underline" href="/privacy">Privacy Policy</a><span className="mx-2">·</span><a className="text-primary hover:underline" href="/terms">Terms of Service</a></p></main>;
}

export function Overview({call,me,setView}) {
  const [data,setData]=useState(),[error,setError]=useState('');
  useEffect(()=>{call('/api/overview').then(setData).catch(error=>setError(error.message));},[call]);
  if(error)return <Alert variant="destructive"><AlertTitle>Unable to load workspace</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if(!data)return <div className="cards">{[1,2,3,4].map(index=><Skeleton key={index} className="h-36"/>)}</div>;
  const metrics=[['Search jobs',data.jobs.total||0,Search,'Total jobs submitted'],['Active jobs',data.jobs.active||0,Activity,'Queued or processing'],['API requests',data.requests.total||0,ArrowUpRight,'API and dashboard requests'],['Average response',`${data.requests.average_ms||0} ms`,Clock,'Request handling time']];
  return <>
    <div className="cards">{metrics.map(([label,value,Icon,description])=><Card key={label}><CardHeader><CardDescription>{label}</CardDescription><CardAction><Icon className="size-4 text-primary"/></CardAction><CardTitle className="text-3xl tabular-nums">{value}</CardTitle></CardHeader><CardFooter><p className="text-sm text-muted-foreground">{description}</p></CardFooter></Card>)}</div>
    <Alert><Activity/><AlertTitle>{data.workers.length?'Search worker is online':'Search worker is offline'}</AlertTitle><AlertDescription>{data.workers.length?'Search jobs are processed in the background. Follow progress from Search jobs.':'Start the worker to process queued searches.'}</AlertDescription></Alert>
    <UsagePanel call={call} setView={setView}/>
    <div className="space-y-4"><div><h2 className="text-lg font-semibold tracking-tight">Build your integration</h2><p className="text-sm text-muted-foreground">Everything you need to bring image search into your application.</p></div><div className="grid gap-4 lg:grid-cols-3">{[['projects','Create a project','Organize searches and usage for each application.',FolderPlus,'Manage projects'],['keys','Generate an API key','Connect your backend with a scoped, expiring key.',KeyRound,'Manage API keys'],['playground','Run your first search','Try a query and inspect the source image URLs.',Search,'Open playground']].map(([view,title,description,Icon,action])=><Card key={view}><CardHeader><Icon className="mb-2 size-5 text-primary"/><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardFooter><Button type="button" variant="outline" onClick={()=>setView(view)}>{action}<ArrowUpRight/></Button></CardFooter></Card>)}</div></div>
    <Card><CardHeader><CardTitle>Integration reference</CardTitle><CardDescription>Submit a job, check its status, and retrieve results in pages.</CardDescription></CardHeader><CardContent><pre>{`POST /v1/images/search\nAuthorization: Bearer YOUR_API_KEY\n\n{ "query": "mountain landscape", "count": "15" }`}</pre></CardContent><CardFooter><Button type="button" variant="outline" onClick={()=>setView('docs')}>Read API guide<ArrowUpRight/></Button></CardFooter></Card>
  </>;
}

export function Jobs({call,toast,modal,setView}){
  const [jobs,setJobs]=useState([]),[selected,setSelected]=useState(null),[status,setStatus]=useState('all'),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(true);
  const load=useCallback(async before=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({limit:'25'});
      if(status!=='all')params.set('status',status);
      if(before)params.set('before',before);
      const data=await call(`/api/jobs?${params}`);
      setJobs(old=>before?old.concat(data.jobs):data.jobs);
      setCursor(data.next_cursor);
    }catch(error){toast(error.message);}finally{setLoading(false);}
  },[call,status,toast]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(selected)document.getElementById('job-detail')?.scrollIntoView({behavior:'smooth',block:'start'});},[selected]);
  const runAgain=async job=>{try{const data=await call(`/api/jobs/${job.id}/retry`,{});toast('New job started');setSelected(data.job_id);await load();}catch(error){toast(error.message);}};
  const summary=job=>{const first=job.queries[0]?.query||'—';return job.queries.length>1?`${first} +${job.queries.length-1} more`:first;};
  return <>
    {selected&&<div id="job-detail"><JobDetail key={selected} id={selected} call={call} toast={toast} modal={modal} onOpenJob={id=>{setSelected(id);load();}}/></div>}
    <Card>
      <CardHeader><CardTitle>Recent jobs</CardTitle><CardDescription>Finished jobs and their results are removed after the retention period shown on each job.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue/></SelectTrigger><SelectContent>{[['all','All statuses'],['running','Running'],['queued','Queued'],['complete','Complete'],['partial','Partial'],['cancelled','Cancelled']].map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Button type="button" variant="outline" aria-label="Refresh jobs" disabled={loading} onClick={()=>load()}><RefreshCw/></Button>
        </div>
        <div className="overflow-hidden rounded-md border"><Table>
          <TableHeader><TableRow>{['Queries','Requested','Found','Status','Created','Actions'].map(column=><TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading&&!jobs.length?<TableRow><TableCell colSpan={6}><Skeleton className="h-16"/></TableCell></TableRow>
            :!jobs.length?<TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{status==='all'?<>No jobs yet. <Button type="button" variant="link" className="h-auto p-0" onClick={()=>setView('playground')}>Run your first search</Button></>:'No jobs with this status.'}</TableCell></TableRow>
            :jobs.map(job=><TableRow key={job.id} data-state={selected===job.id?'selected':undefined}>
              <TableCell className="max-w-64"><div className="truncate font-medium" title={job.queries.map(q=>q.query).join(', ')}>{summary(job)}</div><code className="text-xs text-muted-foreground">{short(job.id)}</code></TableCell>
              <TableCell>{job.requested}</TableCell><TableCell>{job.returned}</TableCell><TableCell><StatusBadge status={job.status}/></TableCell><TableCell>{format(job.created)}</TableCell>
              <TableCell><div className="flex gap-2"><Button type="button" variant="outline" onClick={()=>setSelected(job.id)}>Inspect</Button><Button type="button" variant="ghost" disabled={['queued','running'].includes(job.status)} onClick={()=>runAgain(job)}>Run again</Button></div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table></div>
        {cursor&&<Button type="button" variant="outline" disabled={loading} onClick={()=>load(cursor)}>{loading?'Loading…':'Load older jobs'}</Button>}
      </CardContent>
    </Card>
  </>;
}

export function Logs({call,toast}) {
  const [logs,setLogs]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[loading,setLoading]=useState(true),[selected,setSelected]=useState(null),[cursor,setCursor]=useState(null);
  const load=useCallback(async(before)=>{setLoading(true);try{const params=new URLSearchParams();if(query.trim())params.set('q',query.trim());if(status!=='all')params.set('status',status);if(before)params.set('before',before);const data=await call(`/api/logs?${params}`);setLogs(old=>before?old.concat(data.logs):data.logs);setCursor(data.next_cursor);}catch(error){toast(error.message);}finally{setLoading(false);}},[call,query,status,toast]);
  useEffect(()=>{const timer=setTimeout(()=>load(),250);return()=>clearTimeout(timer);},[load]);
  return <><Card><CardHeader><CardTitle>Request history</CardTitle><CardDescription>Inspect requests, responses, and timing across your projects.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Input aria-label="Search request logs" placeholder="Search routes or request payloads…" className="w-full sm:max-w-sm" value={query} onChange={event=>setQuery(event.target.value)}/><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent>{[['all','All statuses'],['200','200 · OK'],['201','201 · Created'],['202','202 · Accepted'],['400','400 · Bad request'],['401','401 · Unauthorized'],['403','403 · Forbidden'],['429','429 · Rate limited'],['500','500 · Server error']].map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" aria-label="Refresh request logs" disabled={loading} onClick={()=>load()}><RefreshCw/></Button></div><div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{['Time','Method','Route','Status','Duration',''].map((label,index)=><TableHead key={index}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{loading&&!logs.length?<TableRow><TableCell colSpan={6}><Skeleton className="h-24"/></TableCell></TableRow>:!logs.length?<TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No matching requests.</TableCell></TableRow>:logs.map(row=><TableRow key={row.id}><TableCell>{format(row.created)}</TableCell><TableCell><Badge variant="outline">{row.method}</Badge></TableCell><TableCell className="font-mono text-xs">{row.path}</TableCell><TableCell><Badge variant={row.status>=400?'destructive':'secondary'}>{row.status||'Interrupted'}</Badge></TableCell><TableCell>{row.duration??'—'} ms</TableCell><TableCell><Button type="button" variant="ghost" onClick={async()=>{try{setSelected((await call(`/api/logs/${row.id}`)).log);}catch(error){toast(error.message);}}}>Inspect<ArrowUpRight/></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent>{cursor&&<CardFooter><Button type="button" variant="outline" disabled={loading} onClick={()=>load(cursor)}>Load older requests</Button></CardFooter>}</Card><Sheet open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}><SheetContent className="overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Request details</SheetTitle><SheetDescription>Stored metadata and sanitized request/response content.</SheetDescription></SheetHeader><div className="px-4 pb-4"><pre>{JSON.stringify(selected,null,2)}</pre></div></SheetContent></Sheet></>;
}

export function Feedback({call,me,toast}){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{try{setLoading(true);const data=await call('/api/feedback');setRows(data.feedback);}catch(error){toast(error.message);}finally{setLoading(false);}},[call,toast]);
  useEffect(()=>{load();},[load]);
  return <Card ><CardHeader><CardTitle>{me.role==='admin'?'Quality feedback · all accounts':'Your quality feedback'}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Report a problem from an image in Search jobs. Each report stays linked to its result and job.</p>{loading?<Skeleton className="h-32"/>:<div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{(['When','Reason','Job','Result','Status',...(me.role==='admin'?['Action']:[])]).map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{!(rows)?.length&&<TableRow><TableCell colSpan={(['When','Reason','Job','Result','Status',...(me.role==='admin'?['Action']:[])]).length} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}{rows.map(item=><TableRow key={item.id}><TableCell>{format(item.created)}</TableCell><TableCell><StatusBadge status={item.reason}/>{item.note&&<div className="feedbackNote">{item.note}</div>}</TableCell><TableCell><code>{short(item.job_id)}</code></TableCell><TableCell><code>{short(item.result_id)}</code></TableCell><TableCell>{item.status||'open'}</TableCell>{me.role==='admin'&&<TableCell>{item.status==='reviewed'?'—':<Button type="button" variant="outline" onClick={async()=>{try{await call('/api/admin/feedback',{id:item.id});toast('Feedback reviewed');load();}catch(error){toast(error.message)}}}>Mark reviewed</Button>}</TableCell>}</TableRow>)}</TableBody></Table></div>}</CardContent></Card>;
}
export function Docs(){
  const link=(href,text)=><Button asChild variant="outline"><a href={href} target="_blank" rel="noopener noreferrer">{text}<ArrowUpRight/></a></Button>;
  return <>
    <Card><CardHeader><CardTitle>One search API. Any requested count.</CardTitle><CardDescription>Use API keys only from your backend. A search returns a job immediately; read results in pages, or add a webhook to a project so Pluko tells you when a job finishes.</CardDescription></CardHeader><CardContent className="space-y-4">
      <pre>{`curl -X POST $PLUKO_URL/v1/images/search \
  -H "Authorization: Bearer $PLUKO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "mountain landscape", "count": "15", "min_width": 1000 }'`}</pre>
      <div className="flex flex-wrap gap-2">{link('/docs','Full documentation')}{link('/v1/openapi.json','OpenAPI file')}{link('/limits','Limits')}{link('/status','Status')}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Batch searches and filters</CardTitle><CardDescription>Send several queries in one job, and narrow results with optional filters.</CardDescription></CardHeader><CardContent><pre>{`{
  "queries": [
    { "query": "mountain landscape", "count": "15" },
    { "query": "wireless headphones", "count": "30" }
  ],
  "min_width": 800,
  "image_type": "photo",
  "layout": "wide",
  "safe_search": "strict"
}`}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Read results and check usage</CardTitle><CardDescription>Poll with backoff, or use a webhook instead.</CardDescription></CardHeader><CardContent><pre>{`GET /v1/jobs/JOB_ID
GET /v1/jobs/JOB_ID/results?limit=100&after=0
GET /v1/jobs?status=running
GET /v1/usage`}</pre></CardContent></Card>
  </>;
}
