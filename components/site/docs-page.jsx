'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,BookOpen,FileCode2,Gauge,KeyRound,Menu,Search,ThumbsDown,ThumbsUp} from 'lucide-react';
import {LIMITS} from '@/limits.mjs';
import {FILTER_VALUES} from '@/filters.mjs';
import {requestExample,responses} from '@/lib/marketing/content';
import {SAMPLE_EVENT,VERIFY_SNIPPET} from '@/lib/webhook-example';
import {legal} from '@/lib/legal';
import {cn} from '@/lib/utils';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import {BackToTop,Callout,CodeBlock,Heading,LanguageProvider,Prose,PublicShell,SimpleTable,useActiveSection} from './ui';
import site from '@/components/design/design.module.css';
import {useReturnFocus} from '@/components/design/system';

/* ---------- Navigation and search index ---------- */

const GROUPS=[
  {label:'Get started',items:[['quickstart','Quick start','api key environment first request 202'],['authentication','Authentication','bearer token scopes search read revoke']]},
  {label:'Core concepts',items:[['jobs','Jobs and statuses','queued running complete partial cancelled reason'],['pagination','Reading results','next_cursor after poll_after limit page'],['idempotency','Retries and idempotency','idempotency-key 409 conflict retry']]},
  {label:'API reference',items:[['create-search','Create a search','POST /v1/images/search query count min_width'],['get-job','Get a job','GET /v1/jobs/{job_id} status'],['get-results','Read results','GET /v1/jobs/{job_id}/results images'],['list-jobs','List jobs','GET /v1/jobs before status'],['cancel-retry','Cancel and retry','POST cancel retry JOB_FINISHED'],['feedback','Send feedback','POST /v1/feedback not_relevant watermark broken'],['usage','Usage','GET /v1/usage pages quota reset'],['status','Service status','GET /v1/status worker provider']]},
  {label:'Features',items:[['batches','Batch searches','queries array 64 KiB'],['filters','Filters','safe_search image_type layout size color INVALID_FILTER'],['webhooks','Webhooks','job.finished signature hmac Pluko-Signature retries']]},
  {label:'Reference',items:[['errors','Errors and limits','401 403 400 409 413 429 Retry-After rate limit'],['metadata','Image metadata and reuse','image_url thumbnail_url source_url license watermark dimensions'],['openapi','OpenAPI and tools','openapi.json postman insomnia retention expires']]},
];
const ITEMS=GROUPS.flatMap(group=>group.items.map(([id,label,keywords])=>({id,label,keywords,group:group.label})));
const IDS=ITEMS.map(item=>item.id);

function NavList({active,onNavigate}){
  return <nav aria-label="Documentation" className="grid gap-7 text-sm">
    {GROUPS.map(group=><div key={group.label}>
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
      <ul className="grid gap-0.5">
        {group.items.map(([id,label])=><li key={id}><a href={`#${id}`} onClick={onNavigate} aria-current={active===id?'location':undefined} className={cn('block rounded-lg px-3 py-1.5 transition-colors',active===id?'bg-muted font-medium text-foreground':'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>{label}</a></li>)}
      </ul>
    </div>)}
  </nav>;
}

function DocsSearch({open,onOpenChange}){
  const [query,setQuery]=useState(''),[index,setIndex]=useState(0);
  const list=useRef(null);
  useEffect(()=>{if(open){setQuery('');setIndex(0);}},[open]);
  const results=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return ITEMS;
    return ITEMS.filter(item=>`${item.label} ${item.group} ${item.keywords}`.toLowerCase().includes(needle));
  },[query]);
  useEffect(()=>setIndex(0),[query]);
  useEffect(()=>{list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({block:'nearest'});},[index]);
  const go=item=>{onOpenChange(false);setTimeout(()=>{document.getElementById(item.id)?.scrollIntoView({behavior:'smooth'});window.history.replaceState(null,'',`#${item.id}`);},50);};
  const returnFocus=useReturnFocus(open);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent onCloseAutoFocus={returnFocus} showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="sr-only"><DialogTitle>Search the documentation</DialogTitle><DialogDescription>Find a section, endpoint, field or error code</DialogDescription></DialogHeader>
      <div className="flex items-center gap-3 border-b px-4"><Search className="size-4 text-muted-foreground"/>
        <input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search endpoints, fields, error codes…" aria-label="Search the documentation"
          onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setIndex(value=>Math.min(results.length-1,value+1));}else if(event.key==='ArrowUp'){event.preventDefault();setIndex(value=>Math.max(0,value-1));}else if(event.key==='Enter'&&results[index]){event.preventDefault();go(results[index]);}}}
          className="h-13 w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-muted-foreground"/>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Esc</kbd>
      </div>
      <ul ref={list} role="listbox" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
        {!results.length&&<li className="py-10 text-center text-sm text-muted-foreground">Nothing found for “{query}”.</li>}
        {results.map((item,position)=><li key={item.id}><button type="button" role="option" aria-selected={position===index} data-index={position} onMouseMove={()=>setIndex(position)} onClick={()=>go(item)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',position===index&&'bg-muted')}>
          <BookOpen className="size-4 shrink-0 text-muted-foreground"/><span className="flex-1"><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.group}</span></span>{position===index&&<ArrowRight className="size-4 text-muted-foreground"/>}
        </button></li>)}
      </ul>
    </DialogContent>
  </Dialog>;
}

/* ---------- Building blocks ---------- */

function Section({id,title,children}){
  return <section className="border-t pt-14 pb-4 first:border-t-0 first:pt-0"><Heading id={id}>{title}</Heading><div className="mt-6 grid gap-6">{children}</div></section>;
}

const METHOD_TONES={GET:'bg-emerald-500/12 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300',POST:'bg-indigo-500/12 text-indigo-700 ring-indigo-600/20 dark:text-indigo-300'};
// Shared with the in-app API guide so both stay identical.
export function Endpoint({method,path,scope}){
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
    <span className={cn('rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1',METHOD_TONES[method])}>{method}</span>
    <code className="font-mono text-sm break-all">{path}</code>
    <span className="ml-auto text-xs text-muted-foreground">{scope?<>Scope: <code className="font-mono">{scope}</code></>:'No API key needed'}</span>
  </div>;
}

export const c=text=><code className="font-mono">{text}</code>;
export function Params({rows}){
  return <SimpleTable columns={['Field','Type','Description']} rows={rows.map(([name,type,required,text])=>[<span key="n" className="font-mono text-sm">{name}{required&&<span className="ml-1.5 font-sans text-[11px] font-medium text-rose-700">required</span>}</span>,<span key="t" className="font-mono text-sm text-muted-foreground">{type}</span>,text])}/>;
}

export function curl(method,route,body){
  return `curl ${method==='POST'?'-X POST ':''}"$PLUKO_URL${route}" \\\n  -H "Authorization: Bearer $PLUKO_API_KEY"${body?` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body,null,2)}'`:''}`;
}
export const allLanguages=step=>({cURL:requestExample('cURL',step),JavaScript:requestExample('JavaScript',step),Python:requestExample('Python',step)});
export const json=value=>JSON.stringify(value,null,2);

const REASONS=[
  ['requested_count_reached','All requested images were found.'],
  ['source_exhausted_or_no_new_matches','The source ran out of new matching images.'],
  ['daily_page_quota','Stopped at the project’s daily page limit. It resets at 00:00 UTC.'],
  ['provider_failed','The image source kept failing for this query.'],
  ['key_revoked_or_expired','The API key was revoked or expired during the job.'],
  ['user_cancelled','The job was cancelled.'],
];

/* ---------- Page ---------- */

export function DocsPage(){
  const active=useActiveSection(IDS);
  const [search,setSearch]=useState(false),[menu,setMenu]=useState(false),[origin,setOrigin]=useState('https://your-pluko-host');
  useEffect(()=>setOrigin(window.location.origin),[]);
  useEffect(()=>{
    const onKey=event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearch(true);}};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);
  const group=GROUPS.find(item=>item.items.some(([id])=>id===active))||GROUPS[0];
  const searchButton=<button type="button" onClick={()=>setSearch(true)} className="flex h-10 w-full items-center gap-2 rounded-xl border bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground"><Search className="size-4"/>Search docs<kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd></button>;

  return <PublicShell>
    <LanguageProvider>
      <div className="sticky top-16 z-30 flex gap-2 border-b bg-background/90 px-5 py-2.5 backdrop-blur lg:hidden">
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetTrigger asChild><button type="button" className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm"><Menu className="size-4"/>Menu</button></SheetTrigger>
          <SheetContent side="left" className="!w-80 !max-w-[85vw] overflow-y-auto"><SheetHeader><SheetTitle>Documentation</SheetTitle></SheetHeader><div className="px-4 pb-8"><NavList active={active} onNavigate={()=>setMenu(false)}/></div></SheetContent>
        </Sheet>
        <div className="flex-1">{searchButton}</div>
      </div>

      <div className="mx-auto max-w-[1440px] gap-12 px-5 pt-10 pb-24 sm:px-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:pt-28 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
        <aside className="hidden lg:block"><div className="sticky top-24 grid max-h-[calc(100svh-7rem)] gap-6 overflow-y-auto pr-2 pb-6 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--border)_transparent]">{searchButton}<NavList active={active}/></div></aside>

        <article className="min-w-0 max-w-3xl">
          <header className="mb-14">
            <p className="mb-4 text-sm font-medium text-[var(--accent-ink)]">Documentation</p>
            <h1 className={site.title}>Your first image search.</h1>
            <p className={cn(site.lede,'mt-6')}>Call Pluko over HTTP from your backend: create a search job, follow its progress, and read image URLs and metadata. No SDK required.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[['/app/keys',KeyRound,'Get an API key','Create a project and a scoped key.',false],['/v1/openapi.json',FileCode2,'OpenAPI schema','Generate a typed client.',true],['/limits',Gauge,'Limits','Rates, quotas and retention.',false]].map(([href,Icon,title,text,external])=>{
                const body=<><Icon className="size-5 text-[var(--accent-ink)]"/><span className="mt-3 flex items-center gap-1 font-medium">{title}{external?<ArrowUpRight className="size-3.5 text-muted-foreground"/>:<ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"/>}</span><span className="mt-1 text-sm text-muted-foreground">{text}</span></>;
                const className='group flex flex-col rounded-2xl border p-4 transition-colors hover:bg-muted/40';
                return external?<a key={href} href={href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>:<Link key={href} href={href} className={className}>{body}</Link>;
              })}
            </div>
          </header>

          <Section id="quickstart" title="Quick start">
            <ol className="grid gap-8">
              <li className="grid gap-3"><p className="font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">1</span>Create a project and an API key</p>
                <Prose><p>In your <Link href="/app">workspace</Link>, create a project, then generate an API key with the {c('search')} and {c('read')} scopes. Copy it when it’s shown: the full key is displayed only once.</p></Prose></li>
              <li className="grid gap-3"><p className="font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">2</span>Set your environment variables</p>
                <Prose><p>Keep the key on your server. Use your deployment’s address when hosted.</p></Prose>
                <CodeBlock title=".env" code={`PLUKO_URL=${origin}\nPLUKO_API_KEY=YOUR_API_KEY`}/></li>
              <li className="grid gap-3"><p className="font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">3</span>Create your first search</p>
                <CodeBlock title="POST /v1/images/search" samples={allLanguages(0)}/>
                <Callout type="note">A {c('202')} response means the job was accepted, not that images are ready. Use the returned {c('job_id')} with the status and results endpoints below.</Callout></li>
            </ol>
          </Section>

          <Section id="authentication" title="Authentication">
            <Prose><p>Send {c('Authorization: Bearer YOUR_API_KEY')} on every public API request. Keep keys on your server, never in browser code, mobile apps, URLs or logs.</p></Prose>
            <SimpleTable columns={['Scope','Allows']} rows={[[c('search'),'Create, cancel and retry jobs.'],[c('read'),'Read job state, results and usage.']]}/>
            <Callout type="tip">Keys expire automatically and can be rotated or revoked from the API keys page of your workspace. Rotate before a key expires to avoid an outage.</Callout>
          </Section>

          <Section id="jobs" title="Jobs and statuses">
            <Prose><p>A search is a background job. Poll {c('GET /v1/jobs/JOB_ID')} with backoff, or use a <a href="#webhooks">webhook</a>. A job is always in one of these states:</p></Prose>
            <SimpleTable columns={['Status','Meaning']} rows={[[c('queued'),'Accepted and waiting for the worker.'],[c('running'),'Pages are being fetched; results appear as they are found.'],[c('complete'),'Every query found what it asked for.'],[c('partial'),'Finished with fewer images than requested. Check each query’s reason.'],[c('cancelled'),'Stopped before it finished. Results found so far are kept.']]}/>
            <Prose><p>Each query in a job reports a {c('reason')} when it stops:</p></Prose>
            <SimpleTable columns={['Reason','What happened']} rows={REASONS.map(([code,text])=>[c(code),text])}/>
          </Section>

          <Section id="pagination" title="Reading results">
            <Prose>
              <p>Read {c('GET /v1/jobs/JOB_ID/results?limit=100&after=0')}. A page holds up to {LIMITS.resultsPageMax} images. Pass {c('next_cursor')} as {c('after')} to read the next page.</p>
              <p>When {c('next_cursor')} is {c('null')} you have reached the end of the results available right now. If the job is still running, wait and continue from {c('poll_after')} to fetch only new results without reading earlier rows again.</p>
            </Prose>
          </Section>

          <Section id="idempotency" title="Retries and idempotency">
            <Prose><p>Add a unique {c('Idempotency-Key')} header when you create a job. Retrying with the same key and identical input returns the original job instead of starting a second one. Reusing the key with different input returns {c('409 IDEMPOTENCY_CONFLICT')}.</p></Prose>
          </Section>

          <Section id="create-search" title="Create a search">
            <Endpoint method="POST" path="/v1/images/search" scope="search"/>
            <Prose><p>Starts a job and returns {c('202')} straight away. Send either {c('query')} (with an optional {c('count')}) or a {c('queries')} array for a <a href="#batches">batch</a>.</p></Prose>
            <Params rows={[
              ['query','string',false,`The search text, up to ${LIMITS.queryMaxLength} characters.`],
              ['count','string',false,<>Images wanted per query, as a positive decimal string. Default {c('"15"')}. No product cap; the source may have fewer.</>],
              ['queries','array',false,'A batch of { query, count } objects. Queries must be unique.'],
              ['min_width','integer',false,<>Minimum width in pixels, 0 to 20000. Default {c('800')}.</>],
              ['exclude_domains','string[]',false,<>Plain domains to skip, such as {c('example.com')}.</>],
              ['watermark_policy','string',false,<>{c('prefer_clean')} (default) or {c('any')}. A hint from titles and domains, not a guarantee.</>],
              ['safe_search, image_type, layout, size, color','string',false,<>Optional <a className="text-[var(--accent-ink)] underline underline-offset-2" href="#filters">filters</a>.</>],
            ]}/>
            <CodeBlock title="Request" samples={allLanguages(0)}/>
            <CodeBlock title="Response · 202" code={json(responses[0])}/>
          </Section>

          <Section id="get-job" title="Get a job">
            <Endpoint method="GET" path="/v1/jobs/{job_id}" scope="read"/>
            <Prose><p>Returns the job’s status, per-query progress, the filters it ran with, and {c('expires')}: when its results will be removed.</p></Prose>
            <CodeBlock title="Request" samples={allLanguages(1)}/>
            <CodeBlock title="Response · 200 (excerpt)" code={json(responses[1])}/>
          </Section>

          <Section id="get-results" title="Read results">
            <Endpoint method="GET" path="/v1/jobs/{job_id}/results" scope="read"/>
            <Params rows={[['limit','integer',false,`1 to ${LIMITS.resultsPageMax}. Default 50.`],['after','integer',false,<>Cursor from the previous page’s {c('next_cursor')}, or {c('poll_after')} while the job runs. Default 0.</>]]}/>
            <CodeBlock title="Request" samples={allLanguages(2)}/>
            <CodeBlock title="Response · 200 (excerpt)" code={json(responses[2])}/>
          </Section>

          <Section id="list-jobs" title="List jobs">
            <Endpoint method="GET" path="/v1/jobs" scope="read"/>
            <Prose><p>Lists the key’s project jobs, newest first.</p></Prose>
            <Params rows={[['limit','integer',false,`1 to ${LIMITS.resultsPageMax}. Default 50.`],['status','string',false,<>{c('queued')}, {c('running')}, {c('complete')}, {c('partial')} or {c('cancelled')}.</>],['before','integer',false,<>Pass {c('next_cursor')} from the previous page.</>]]}/>
            <CodeBlock title="Request" code={curl('GET','/v1/jobs?status=running')}/>
          </Section>

          <Section id="cancel-retry" title="Cancel and retry">
            <Endpoint method="POST" path="/v1/jobs/{job_id}/cancel" scope="search"/>
            <Endpoint method="POST" path="/v1/jobs/{job_id}/retry" scope="search"/>
            <Prose><p>Cancel stops a queued or running job. A job that already finished returns {c('409 JOB_FINISHED')} and keeps its status. Retry creates a new job from the original request and returns its {c('job_id')}.</p></Prose>
            <CodeBlock title="Request" code={curl('POST','/v1/jobs/JOB_ID/cancel')}/>
          </Section>

          <Section id="feedback" title="Send feedback">
            <Endpoint method="POST" path="/v1/feedback" scope="search"/>
            <Params rows={[['job_id','string',true,'The job the result belongs to.'],['result_id','string',true,<>The image’s {c('id')}.</>],['reason','string',true,<>{c('not_relevant')}, {c('watermark')}, {c('broken')} or {c('other')}.</>],['note','string',false,'Up to 1000 characters.']]}/>
            <CodeBlock title="Request" code={curl('POST','/v1/feedback',{job_id:'JOB_ID',result_id:'IMAGE_ID',reason:'not_relevant',note:'The result does not match the query.'})}/>
            <Prose><p>List your reports, newest first, with {c('GET /v1/feedback')} (read scope). Each one includes an {c('image')} with its title, URLs and source domain, or {c('null')} once retention has removed the result.</p></Prose>
          </Section>

          <Section id="usage" title="Usage">
            <Endpoint method="GET" path="/v1/usage" scope="read"/>
            <Prose><p>Today’s provider pages used, the project’s daily limit, pages remaining, when it resets (00:00 UTC) and the last week. A page is one request to the image source and returns up to {LIMITS.imagesPerPage} images.</p></Prose>
            <CodeBlock title="Request" code={curl('GET','/v1/usage')}/>
          </Section>

          <Section id="status" title="Service status">
            <Endpoint method="GET" path="/v1/status"/>
            <Prose><p>Reports whether the API, the search worker and the image source are working. It needs no key and is also shown on the <Link href="/status">status page</Link>.</p></Prose>
            <CodeBlock title="Request" code={`curl "$PLUKO_URL/v1/status"`}/>
          </Section>

          <Section id="batches" title="Batch searches">
            <Prose><p>Send several unique queries in one job, each with its own count. JSON bodies are limited to {LIMITS.requestBodyBytes/1024} KiB, so split very large batches across jobs. There’s no image-count cap, but source availability and your project’s daily limit still apply.</p></Prose>
            <CodeBlock title="Request body" code={json({queries:[{query:'mountain landscape',count:'15'},{query:'wireless headphones',count:'30'}],min_width:800,watermark_policy:'prefer_clean'})}/>
          </Section>

          <Section id="filters" title="Filters">
            <Prose><p>Narrow a search with optional fields next to {c('query')}. Omit a field, or send {c('any')}, to leave it unfiltered. Filters are passed to the image source on a best-effort basis, so some results may not match exactly.</p></Prose>
            <SimpleTable columns={['Field','Values']} rows={Object.entries(FILTER_VALUES).map(([name,values])=>[c(name),<span key="v" className="flex flex-wrap gap-1">{values.map(value=><code key={value} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}</code>)}</span>])}/>
            <Callout type="warning">{c('safe_search')} defaults to {c('moderate')} and can’t be switched off. An invalid value returns {c('400 INVALID_FILTER')}.</Callout>
            <CodeBlock title="Request body" code={json({query:'city skyline',count:'20',image_type:'photo',layout:'wide',size:'large',safe_search:'strict'})}/>
          </Section>

          <Section id="webhooks" title="Webhooks">
            <Prose><p>Skip polling: add a webhook to a project (Projects → Webhook) and Pluko sends a signed {c('POST')} to your https endpoint when a job becomes {c('complete')}, {c('partial')} or {c('cancelled')}. Fetch the results with the usual results endpoint using the event’s {c('job_id')}.</p></Prose>
            <CodeBlock title="Event body" code={json(SAMPLE_EVENT)}/>
            <Prose><p>Each request carries {c('Pluko-Event')}, {c('Pluko-Delivery')} (unique per event; use it to ignore duplicates) and {c('Pluko-Signature')} as {c('t=<ms>,v1=<hex>')}. {c('v1')} is the HMAC-SHA256 of {c('"<t>.<raw body>"')} using your signing secret, which is shown once when you save the webhook. Verify it, and reject timestamps older than five minutes.</p></Prose>
            <CodeBlock title="verify.js" code={VERIFY_SNIPPET}/>
            <SimpleTable columns={['Rule','Detail']} rows={[['Answer quickly',<>Any {c('2xx')} status within 8 seconds.</>],['Retries','Up to 5, after about 30 seconds, 2 minutes, 10 minutes, 1 hour and 6 hours. Retry a failed one from the dashboard.'],['Endpoint','https on port 443 with a public domain name. Private and internal addresses are refused.'],['Ordering','At least once, not strictly ordered. Treat the job status as the source of truth.']]}/>
          </Section>

          <Section id="errors" title="Errors and limits">
            <Prose><p>Errors share one shape. Keep {c('request_id')} and {c('job_id')} when you investigate a failure, and never include credentials in support reports.</p></Prose>
            <CodeBlock title="Error body" code={json({error:{code:'UNAUTHORIZED',message:'Provide a Bearer API key'},request_id:'req_example'})}/>
            <SimpleTable columns={['Status','When']} rows={[[c('400'),'Invalid query, count or other input.'],[c('401'),'Missing, expired or revoked key.'],[c('403'),'Missing scope or unavailable account access.'],[c('409'),'An idempotency key was reused with different input, or the job already finished.'],[c('413'),`The request body is larger than ${LIMITS.requestBodyBytes/1024} KiB.`],[c('429'),<>Rate or queue limit. Respect the {c('Retry-After')} header.</>]]}/>
            <SimpleTable columns={['Limit','Value']} rows={[['Requests per key',`${LIMITS.keyPerMinute} per minute`],['Requests per account',`${LIMITS.accountPerMinute} per minute across all keys`],['Active jobs per project',`${LIMITS.activeJobsPerProject} queued or running`],['Daily provider pages','Per project; see Usage']]}/>
            <Prose><p>Every limit is listed on the <Link href="/limits">limits page</Link>.</p></Prose>
          </Section>

          <Section id="metadata" title="Image metadata and reuse">
            <SimpleTable columns={['Field','Notes']} rows={[[c('image_url'),'The full image on its original host.'],[c('thumbnail_url'),'A smaller preview, when the source provides one.'],[c('source_url'),'The page the image was found on.'],[c('width, height'),<>Reported by the source; {c('dimensions_verified')} says whether they were checked.</>],[c('license_status'),<>Always {c('unknown')} unless a source supplies verifiable licence data.</>],[c('watermark_hint'),'A title and domain heuristic, not a guarantee.']]}/>
            <Callout type="warning" title="Search results grant no reuse rights">Review the original source and its licensing before you use an image. Pluko never removes watermarks, and it stores metadata and logs, not image files. Source URLs can expire or block embedding, so handle image-load failures in your app.</Callout>
          </Section>

          <Section id="openapi" title="OpenAPI and tools">
            <Prose>
              <p><a href="/v1/openapi.json">{c('GET /v1/openapi.json')}</a> is the OpenAPI 3.1 description. Import it into Postman, Insomnia or a code generator.</p>
              <p>Results are removed after the retention period shown on each job ({c('expires')}), 30 days after it finishes by default. Export what you need before then.</p>
            </Prose>
          </Section>

          <div className="mt-16 flex flex-col gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Was this page helpful?</p><p className="text-sm text-muted-foreground">Tell us what’s missing. We read every note.</p></div>
            <div className="flex gap-2">
              <a href={`mailto:${legal.email}?subject=${encodeURIComponent('Docs feedback: helpful')}`} className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:bg-muted"><ThumbsUp className="size-4"/>Yes</a>
              <a href={`mailto:${legal.email}?subject=${encodeURIComponent('Docs feedback: needs work')}`} className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:bg-muted"><ThumbsDown className="size-4"/>Not really</a>
            </div>
          </div>
        </article>

        <aside className="hidden xl:block"><div className="sticky top-24 grid gap-8 text-sm">
          <nav aria-label="In this group">
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
            <ul className="grid gap-1 border-l">{group.items.map(([id,label])=><li key={id}><a href={`#${id}`} className={cn('-ml-px block border-l py-1 pl-4 transition-colors',active===id?'border-foreground font-medium text-foreground':'border-transparent text-muted-foreground hover:text-foreground')}>{label}</a></li>)}</ul>
          </nav>
          <div className="grid gap-2 border-t pt-6 text-muted-foreground">
            <Link href="/status" className="hover:text-foreground">System status</Link>
            <Link href="/limits" className="hover:text-foreground">Limits</Link>
            <Link href="/contact" className="hover:text-foreground">Contact support</Link>
          </div>
        </div></aside>
      </div>
      <DocsSearch open={search} onOpenChange={setSearch}/>
      <BackToTop/>
    </LanguageProvider>
  </PublicShell>;
}
