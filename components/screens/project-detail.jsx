'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {FolderX,Gauge,KeyRound,Plus,Search,Sparkles,Trash2,Webhook} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CodeBlock,CopyField,DescriptionList,EmptyState,MiniBars,PageHeader,Shimmer,StatCard,StatusBadge,TimeAgo,UsageMeter,toast} from '@/components/workspace/ui';
import {CreateKeyDialog,KeyRevealDialog,KeysTable,keyState} from '@/components/screens/keys';
import {DeleteProjectDialog,QuotaDialog} from '@/components/screens/projects';
import {WebhookSettings} from '@/components/screens/webhook-settings';
import {format} from '@/lib/display';
import {dailySeries} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/ui/card';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const TABS=[['overview','Overview'],['keys','API keys'],['webhook','Webhook'],['settings','Settings']];

function OverviewTab({project,usage,keys}){
  const {href}=useWorkspace();
  const active=keys?.filter(item=>!item.revoked)||[];
  const series=dailySeries(usage?.history||[]);
  return <div className="grid gap-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pages used today" value={usage?usage.pages_used.toLocaleString():'—'} icon={Gauge} footer={usage&&<div className="w-full"><UsageMeter used={usage.pages_used} quota={usage.pages_quota} label="Usage today" showText={false}/></div>}/>
      <StatCard label="Left today" value={usage?usage.pages_remaining.toLocaleString():'—'} hint={usage?`About ${(usage.pages_remaining*usage.images_per_page).toLocaleString()} more images`:''}/>
      <StatCard label="Active API keys" value={keys?active.length:'—'} icon={KeyRound} hint={keys?`${active.filter(item=>keyState(item)==='expiring').length} expiring soon`:''}/>
      <StatCard label="Webhook" value={<span className="text-2xl">{project.webhook_url?'On':'Off'}</span>} icon={Webhook} hint={project.webhook_url?'Events are sent when jobs finish':'Polling only'}/>
    </div>
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3"><CardHeader><CardTitle>Provider pages, last 7 days</CardTitle><CardDescription>Resets every day at 00:00 UTC{usage?`, next ${format(usage.resets_at)}`:''}.</CardDescription></CardHeader><CardContent>{usage?<MiniBars data={series} valueLabel="pages" height={120}/>:<Shimmer className="h-32"/>}</CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="grid gap-4">
        <CopyField value={project.id} label="Project ID" description="Send it as project_id when you search from the dashboard API."/>
        <DescriptionList className="sm:grid-cols-[7rem_1fr]" items={[['Created',<TimeAgo key="c" value={project.created}/>],['Daily limit',`${project.daily_pages.toLocaleString()} pages`],['Owner',project.owner]]}/>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Quick start</CardTitle><CardDescription>Use a key from this project to search from your backend.</CardDescription></CardHeader>
      <CardContent><CodeBlock title="Create a search job" language="bash" code={`curl -X POST ${typeof window==='undefined'?'':window.location.origin}/v1/images/search \\\n  -H "Authorization: Bearer $PLUKO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "query": "mountain landscape", "count": "30" }'`}/></CardContent>
      <CardFooter className="gap-2"><Button asChild size="sm"><Link href={href('projects',project.id,'keys')}><KeyRound/>Manage keys</Link></Button><Button asChild size="sm" variant="outline"><Link href={href('playground')}><Sparkles/>Try in playground</Link></Button></CardFooter>
    </Card>
  </div>;
}

function KeysTab({project,keys,projects}){
  const [creating,setCreating]=useState(false),[secret,setSecret]=useState(null),[query,setQuery]=useState('');
  const rows=keys.data?.keys.filter(item=>item.project_id===project.id&&(!query||item.name.toLowerCase().includes(query.toLowerCase())));
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><Input type="search" data-search-input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search keys…" aria-label="Search keys" className="h-8 w-full sm:w-64"/><Button type="button" onClick={()=>setCreating(true)}><Plus/>Create API key</Button></div>
    <KeysTable keys={rows} loading={keys.loading} error={keys.error} reload={keys.reload} showProject={false}
      empty={query?<EmptyState icon={Search} title="No matching keys"/>:<EmptyState icon={KeyRound} title="No keys in this project" description="Create a key to call the API with this project’s limits." action={<Button onClick={()=>setCreating(true)}><Plus/>Create API key</Button>}/>}/>
    <CreateKeyDialog open={creating} onOpenChange={setCreating} projects={projects} defaultProject={project.id} onCreated={async value=>{setSecret(value);await keys.reload({quiet:true});}}/>
    <KeyRevealDialog secret={secret} onClose={()=>{setSecret(null);toast.success('API key created');}}/>
  </div>;
}

function SettingsTab({project,refresh}){
  const {me,call,navigate}=useWorkspace();
  const [name,setName]=useState(project.name),[busy,setBusy]=useState(false),[quota,setQuota]=useState(null),[deleting,setDeleting]=useState(null);
  useEffect(()=>setName(project.name),[project.name]);
  const rename=async event=>{
    event.preventDefault();setBusy(true);
    try{await call('/api/projects/rename',{id:project.id,name});toast.success('Project renamed');await refresh();}
    catch(failure){toast.error(failure.message);}
    finally{setBusy(false);}
  };
  return <div className="grid max-w-3xl gap-6">
    <Card>
      <CardHeader><CardTitle>Project name</CardTitle><CardDescription>Shown in the dashboard, usage and exports.</CardDescription></CardHeader>
      <CardContent><form id="project-rename" onSubmit={rename}><Field><FieldLabel htmlFor="project-name-setting" className="sr-only">Project name</FieldLabel><Input id="project-name-setting" required maxLength={100} value={name} onChange={event=>setName(event.target.value)} className="max-w-md"/></Field></form></CardContent>
      <CardFooter className="justify-between gap-3"><span className="text-xs text-muted-foreground">Up to 100 characters.</span><Button type="submit" form="project-rename" size="sm" disabled={busy||!name.trim()||name===project.name}>{busy&&<Spinner/>}Save</Button></CardFooter>
    </Card>
    <Card>
      <CardHeader><CardTitle>Daily page limit</CardTitle><CardDescription>Searches stop as “partial” once a project uses its pages for the day.</CardDescription></CardHeader>
      <CardContent><p className="text-2xl font-semibold tabular-nums">{project.daily_pages.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">pages per day</span></p></CardContent>
      <CardFooter className="justify-between gap-3"><span className="text-xs text-muted-foreground">{me.role==='admin'?'You can change this as an administrator.':'Contact support if you need a higher limit.'}</span>{me.role==='admin'&&<Button type="button" size="sm" variant="outline" onClick={()=>setQuota(project)}>Edit limit</Button>}</CardFooter>
    </Card>
    <Card className="border-destructive/40">
      <CardHeader><CardTitle className="text-destructive">Delete project</CardTitle><CardDescription>Permanently removes the project, its API keys, jobs, results, usage history and feedback.</CardDescription></CardHeader>
      <CardFooter className="justify-end border-destructive/20 bg-destructive/5"><Button type="button" variant="destructive" size="sm" onClick={()=>setDeleting(project)}><Trash2/>Delete project</Button></CardFooter>
    </Card>
    <QuotaDialog project={quota} onOpenChange={open=>{if(!open)setQuota(null);}} onDone={refresh}/>
    <DeleteProjectDialog project={deleting} onOpenChange={open=>{if(!open)setDeleting(null);}} onDone={()=>navigate('projects')}/>
  </div>;
}

export function ProjectPage(){
  const {route,href,navigate}=useWorkspace();
  const projects=useResource('/api/projects');
  const usage=useResource('/api/usage');
  const keys=useResource('/api/keys');
  const project=useMemo(()=>projects.data?.projects.find(item=>item.id===route.id),[projects.data,route.id]);
  const projectUsage=usage.data?.projects.find(item=>item.project_id===route.id);
  const refresh=async()=>{await Promise.all([projects.reload({quiet:true}),usage.reload({quiet:true})]);};
  const back={href:href('projects'),label:'Projects'};

  if(projects.loading&&!projects.data)return <div className="grid gap-6"><div className="space-y-2"><Shimmer className="h-4 w-20"/><Shimmer className="h-8 w-64"/></div><Shimmer className="h-9 w-80"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(index=><Shimmer key={index} className="h-28"/>)}</div></div>;
  if(!project)return <><PageHeader title="Project not found" back={back}/><EmptyState icon={FolderX} title="This project doesn’t exist" description="It may have been deleted, or it belongs to another account." action={<Button asChild><Link href={href('projects')}>Back to projects</Link></Button>}/></>;

  return <>
    <PageHeader back={back} title={project.name} eyebrow={project.webhook_url?<StatusBadge status="active" label="Webhook on"/>:null}
      description={`Created ${format(project.created)} · ${project.daily_pages.toLocaleString()} pages per day`}
      actions={<Button asChild variant="outline"><Link href={href('playground')}><Sparkles/>Search</Link></Button>}/>
    <Tabs value={route.tab} onValueChange={tab=>navigate('projects',project.id,tab)}>
      <TabsList variant="line" className="h-9 w-full justify-start overflow-x-auto overflow-y-hidden border-b">{TABS.map(([value,label])=><TabsTrigger key={value} value={value} className="flex-none">{label}</TabsTrigger>)}</TabsList>
    </Tabs>
    {route.tab==='overview'&&<OverviewTab project={project} usage={projectUsage} keys={keys.data?.keys.filter(item=>item.project_id===project.id)}/>}
    {route.tab==='keys'&&<KeysTab project={project} keys={keys} projects={projects.data.projects}/>}
    {route.tab==='webhook'&&<WebhookSettings project={project} refresh={refresh}/>}
    {route.tab==='settings'&&<SettingsTab project={project} refresh={refresh}/>}
  </>;
}
