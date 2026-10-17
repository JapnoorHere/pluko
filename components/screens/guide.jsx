'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,KeyRound,Plus,Webhook} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {Callout,CodeBlock,CopyField,LanguageProvider,PageHeader,Shimmer,TimeAgo,ToneBadge} from '@/components/workspace/ui';
import {useActiveSection} from '@/components/design/system';
import {Endpoint,Params,allLanguages,c,json} from '@/components/site/docs-page';
import {FILTER_VALUES} from '@/filters.mjs';
import {LIMITS} from '@/limits.mjs';
import {responses} from '@/lib/marketing/content';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';

// The in-app guide: the same building blocks as /docs, with this account's base URL and keys filled in.
const SECTIONS=[['guide-setup','Your base URL and keys'],['guide-create','Create a search'],['guide-status','Check the job'],['guide-results','Read the results'],['guide-webhooks','Get notified instead'],['guide-batches','Batches and filters'],['guide-errors','Errors and limits']];

function Section({id,index,title,children}){
  return <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-5 border-t pt-12 first:border-t-0 first:pt-0">
    <h2 id={`${id}-title`} className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">{String(index+1).padStart(2,'0')}</span>{title}</h2>
    {children}
  </section>;
}

function Text({children}){
  return <p className="max-w-2xl text-[15px] leading-relaxed text-foreground/80 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[0.86em]">{children}</p>;
}

function YourKeys(){
  const {href}=useWorkspace();
  const keys=useResource('/api/keys');
  const active=keys.data?.keys.filter(item=>!item.revoked)||[];
  return <div className="overflow-hidden rounded-2xl border bg-card">
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-brand"/>Your active keys</p><Button asChild size="sm" variant="ghost" className="rounded-full"><Link href={href('keys')}>Manage<ArrowUpRight/></Link></Button></div>
    {!keys.data?<div className="grid gap-2 p-4"><Shimmer className="h-5 w-2/3"/><Shimmer className="h-5 w-1/2"/></div>
    :!active.length?<div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-muted-foreground">You don’t have an active key yet.<Button asChild size="sm" className="rounded-full"><Link href={href('keys')}><Plus/>Create a key</Link></Button></div>
    :<ul className="divide-y">{active.slice(0,5).map(item=><li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
      <span className="font-medium">{item.name}</span><code className="font-mono text-xs text-muted-foreground">{item.prefix}…</code><span className="text-muted-foreground">{item.project}</span>
      <span className="ml-auto text-xs text-muted-foreground">Expires <TimeAgo value={item.expires}/></span>
    </li>)}</ul>}
    <p className="border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">Full keys are shown only once, when they’re created. Keep them in your backend’s environment variables.</p>
  </div>;
}

export function Guide(){
  const {href}=useWorkspace();
  const [origin,setOrigin]=useState('https://your-pluko-host');
  useEffect(()=>setOrigin(window.location.origin),[]);
  const ids=useMemo(()=>SECTIONS.map(([id])=>id),[]);
  const active=useActiveSection(ids);
  return <LanguageProvider>
    <PageHeader title="API guide" description="Everything you need to call Pluko from your backend, with your own base URL and keys. The full reference lives in the documentation."
      actions={<Button asChild variant="outline"><a href="/docs" target="_blank" rel="noopener noreferrer">Full documentation<ArrowUpRight/></a></Button>}/>
    <div className="grid items-start gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Guide sections" className="hidden lg:sticky lg:top-24 lg:grid lg:border-l">
        <p className="mb-3 pl-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
        {SECTIONS.map(([id,label],index)=><a key={id} href={`#${id}`} aria-current={active===id?'location':undefined} className={cn('-ml-px flex gap-2 border-l py-1.5 pl-4 text-sm transition-colors',active===id?'border-foreground font-medium text-foreground':'border-transparent text-muted-foreground hover:text-foreground')}><span className="font-mono text-xs text-muted-foreground">{String(index+1).padStart(2,'0')}</span>{label}</a>)}
      </nav>
      <div className="grid min-w-0 max-w-3xl gap-12">
        <Section id="guide-setup" index={0} title="Your base URL and keys">
          <Text>Send your key as a bearer token on every request. Use keys only from your backend, never in browser or mobile code.</Text>
          <div className="grid gap-4 sm:grid-cols-2"><CopyField value={origin} label="Base URL"/><CopyField value="Authorization: Bearer $PLUKO_API_KEY" label="Header"/></div>
          <YourKeys/>
          <CodeBlock title=".env" code={`PLUKO_URL=${origin}\nPLUKO_API_KEY=YOUR_API_KEY`}/>
        </Section>

        <Section id="guide-create" index={1} title="Create a search">
          <Endpoint method="POST" path="/v1/images/search" scope="search"/>
          <Text>Returns {c('202')} straight away with a {c('job_id')}; the search runs in the background. Add an {c('Idempotency-Key')} header so a retried request doesn’t start a second job.</Text>
          <Params rows={[
            ['query','string',false,`The search text, up to ${LIMITS.queryMaxLength} characters.`],
            ['count','string',false,<>Images wanted per query, as a decimal string. Default {c('"15"')}.</>],
            ['queries','array',false,'A batch of { query, count } objects instead of one query.'],
            ['min_width','integer',false,<>Minimum width in pixels. Default {c('800')}.</>],
          ]}/>
          <CodeBlock title="Request" samples={allLanguages(0)}/>
          <CodeBlock title="Response · 202" code={json(responses[0])}/>
        </Section>

        <Section id="guide-status" index={2} title="Check the job">
          <Endpoint method="GET" path="/v1/jobs/{job_id}" scope="read"/>
          <Text>Poll with backoff until the status is {c('complete')}, {c('partial')} or {c('cancelled')}. Each query reports a {c('reason')} when it stops.</Text>
          <CodeBlock title="Request" samples={allLanguages(1)}/>
        </Section>

        <Section id="guide-results" index={3} title="Read the results">
          <Endpoint method="GET" path="/v1/jobs/{job_id}/results" scope="read"/>
          <Text>Pages hold up to {LIMITS.resultsPageMax} images. Pass {c('next_cursor')} as {c('after')} until it’s {c('null')}; while the job runs, continue from {c('poll_after')}.</Text>
          <CodeBlock title="Request" samples={allLanguages(2)}/>
          <CodeBlock title="Response · 200 (excerpt)" code={json(responses[2])}/>
        </Section>

        <Section id="guide-webhooks" index={4} title="Get notified instead">
          <Text>Add a webhook to a project and Pluko sends a signed {c('job.finished')} event to your https endpoint when a job is complete, partial or cancelled. No polling needed.</Text>
          <div className="flex flex-wrap gap-2"><Button asChild size="sm" className="rounded-full px-4"><Link href={href('projects')}><Webhook/>Set up a webhook</Link></Button><Button asChild size="sm" variant="outline" className="rounded-full"><a href="/docs#webhooks" target="_blank" rel="noopener noreferrer">How to verify signatures<ArrowUpRight/></a></Button></div>
        </Section>

        <Section id="guide-batches" index={5} title="Batches and filters">
          <Text>Send several queries in one job and narrow results with optional filters. Filters are best effort, so some results may not match exactly.</Text>
          <CodeBlock title="Request body" code={json({queries:[{query:'mountain landscape',count:'15'},{query:'wireless headphones',count:'30'}],min_width:800,image_type:'photo',layout:'wide',safe_search:'strict'})}/>
          <div className="overflow-hidden rounded-2xl border bg-card"><dl className="divide-y text-sm">{Object.entries(FILTER_VALUES).map(([name,values])=><div key={name} className="grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]"><dt>{c(name)}</dt><dd className="flex flex-wrap gap-1">{values.map(value=><code key={value} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}</code>)}</dd></div>)}</dl></div>
        </Section>

        <Section id="guide-errors" index={6} title="Errors and limits">
          <Text>Errors share one shape. Keep the {c('request_id')} when you investigate, and back off on {c('429')} using the {c('Retry-After')} header.</Text>
          <CodeBlock title="Error body" code={json({error:{code:'UNAUTHORIZED',message:'Provide a Bearer API key'},request_id:'req_example'})}/>
          <div className="flex flex-wrap gap-2 text-sm">{[`${LIMITS.keyPerMinute} requests/min per key`,`${LIMITS.accountPerMinute} requests/min per account`,`${LIMITS.activeJobsPerProject} active jobs per project`].map(label=><ToneBadge key={label} tone="neutral">{label}</ToneBadge>)}</div>
          <Callout type="tip" title="Everything else">Every endpoint, field and error code is in the <a href="/docs" target="_blank" rel="noopener noreferrer">full documentation</a>, and all limits are on the <a href="/limits" target="_blank" rel="noopener noreferrer">limits page</a>.</Callout>
          <CodeBlock title="Service status (no key needed)" code={'curl "$PLUKO_URL/v1/status"'}/>
        </Section>
      </div>
    </div>
  </LanguageProvider>;
}
