'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowUpRight,FileCode2,FileText,Gauge,KeyRound,Webhook} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {CodeBlock,CopyField,PageHeader} from '@/components/workspace/ui';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';

const examples=origin=>({
  create:{
    curl:`curl -X POST ${origin}/v1/images/search \\
  -H "Authorization: Bearer $PLUKO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{ "query": "mountain landscape", "count": "15", "min_width": 1000 }'`,
    node:`const response = await fetch("${origin}/v1/images/search", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.PLUKO_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({ query: "mountain landscape", count: "15", min_width: 1000 }),
});
const { job_id } = await response.json();`,
    python:`import os, uuid, requests

response = requests.post(
    "${origin}/v1/images/search",
    headers={
        "Authorization": f"Bearer {os.environ['PLUKO_API_KEY']}",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json={"query": "mountain landscape", "count": "15", "min_width": 1000},
)
job_id = response.json()["job_id"]`,
  },
  read:{
    curl:`# Check progress, then read results 100 at a time
curl ${origin}/v1/jobs/$JOB_ID -H "Authorization: Bearer $PLUKO_API_KEY"
curl "${origin}/v1/jobs/$JOB_ID/results?limit=100&after=0" -H "Authorization: Bearer $PLUKO_API_KEY"`,
    node:`async function results(jobId) {
  const headers = { Authorization: \`Bearer \${process.env.PLUKO_API_KEY}\` };
  const images = [];
  let after = 0;
  for (;;) {
    const page = await fetch(\`${origin}/v1/jobs/\${jobId}/results?limit=100&after=\${after}\`, { headers }).then((r) => r.json());
    images.push(...page.images);
    if (page.next_cursor === null) return images;
    after = page.next_cursor;
  }
}`,
    python:`def results(job_id):
    headers = {"Authorization": f"Bearer {os.environ['PLUKO_API_KEY']}"}
    images, after = [], 0
    while True:
        page = requests.get(f"${origin}/v1/jobs/{job_id}/results",
                            params={"limit": 100, "after": after}, headers=headers).json()
        images += page["images"]
        if page["next_cursor"] is None:
            return images
        after = page["next_cursor"]`,
  },
});

const BATCH=`{
  "queries": [
    { "query": "mountain landscape", "count": "15" },
    { "query": "wireless headphones", "count": "30" }
  ],
  "min_width": 800,
  "image_type": "photo",
  "layout": "wide",
  "safe_search": "strict",
  "exclude_domains": ["example.com"]
}`;

function LanguageTabs({code,title}){
  return <Tabs defaultValue="curl" className="gap-0">
    <TabsList variant="line" className="mb-2"><TabsTrigger value="curl">cURL</TabsTrigger><TabsTrigger value="node">Node.js</TabsTrigger><TabsTrigger value="python">Python</TabsTrigger></TabsList>
    {Object.entries(code).map(([language,text])=><TabsContent key={language} value={language}><CodeBlock title={title} language={language==='curl'?'bash':language==='node'?'javascript':'python'} code={text}/></TabsContent>)}
  </Tabs>;
}

export function Guide(){
  const {href}=useWorkspace();
  const [origin,setOrigin]=useState('https://your-pluko-host');
  useEffect(()=>setOrigin(window.location.origin),[]);
  const code=examples(origin);
  const links=[
    [href('keys'),'API keys','Create and rotate scoped keys.',KeyRound,false],
    ['/docs','Full documentation','Every endpoint, field and error code.',FileText,true],
    ['/v1/openapi.json','OpenAPI schema','Generate a typed client.',FileCode2,true],
    ['/limits','Limits','Rate limits, page sizes and quotas.',Gauge,true],
    ['/status','System status','Live health of the API and workers.',Activity,true],
  ];
  return <>
    <PageHeader title="API guide" description="Three calls cover most integrations: create a job, wait for it, then read results in pages."
      actions={<Button asChild variant="outline"><a href="/docs" target="_blank" rel="noopener noreferrer">Full documentation<ArrowUpRight/></a></Button>}/>
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="grid min-w-0 gap-6">
        <Card><CardHeader><CardTitle>Base URL and authentication</CardTitle><CardDescription>Send your key as a bearer token. Use keys only from your backend, never in browser or mobile code.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2"><CopyField value={origin} label="Base URL"/><CopyField value="Authorization: Bearer $PLUKO_API_KEY" label="Header"/></CardContent></Card>
        <Card><CardHeader><CardTitle><span className="mr-2 text-muted-foreground">1.</span>Create a search job</CardTitle><CardDescription>The call returns a job ID immediately; the search runs in the background. Add an <code>Idempotency-Key</code> so a retried request doesn’t start a second job.</CardDescription></CardHeader><CardContent><LanguageTabs code={code.create} title="POST /v1/images/search"/></CardContent></Card>
        <Card><CardHeader><CardTitle><span className="mr-2 text-muted-foreground">2.</span>Wait for it to finish</CardTitle><CardDescription>Poll <code>GET /v1/jobs/JOB_ID</code> with backoff, or add a webhook to the project and Pluko will call you when the job is complete, partial or cancelled.</CardDescription></CardHeader>
          <CardContent><Button asChild variant="outline" size="sm"><Link href={href('projects')}><Webhook/>Set up a webhook</Link></Button></CardContent></Card>
        <Card><CardHeader><CardTitle><span className="mr-2 text-muted-foreground">3.</span>Read results in pages</CardTitle><CardDescription>Pages hold up to 100 images. Keep reading until <code>next_cursor</code> is <code>null</code>.</CardDescription></CardHeader><CardContent><LanguageTabs code={code.read} title="GET /v1/jobs/JOB_ID/results"/></CardContent></Card>
        <Card><CardHeader><CardTitle>Batch queries and filters</CardTitle><CardDescription>Send several queries in one job and narrow results with optional filters. Filters are best effort.</CardDescription></CardHeader><CardContent><CodeBlock title="Request body" language="json" code={BATCH}/></CardContent></Card>
      </div>
      <aside className="grid content-start gap-3 lg:sticky lg:top-20">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Reference</p>
        {links.map(([url,title,text,Icon,external])=>{
          const body=<><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40"><Icon className="size-4 text-primary"/></span><span className="grid min-w-0 gap-0.5"><span className="flex items-center gap-1 text-sm font-medium">{title}{external&&<ArrowUpRight className="size-3 text-muted-foreground"/>}</span><span className="text-xs text-muted-foreground">{text}</span></span></>;
          const className='flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40';
          return external?<a key={url} href={url} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>:<Link key={url} href={url} className={className}>{body}</Link>;
        })}
      </aside>
    </div>
  </>;
}
