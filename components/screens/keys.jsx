'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Ban,FolderPlus,KeyRound,Pencil,Plus,RefreshCw,Search} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CodeBlock,ConfirmDialog,DataTable,EmptyState,FormDialog,InlineError,PageHeader,RowActions,SearchInput,SecretReveal,TableToolbar,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {daysLeft} from '@/lib/display';
import {matches} from '@/lib/ui-helpers';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Spinner} from '@/components/ui/spinner';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const parseScopes=value=>{try{return JSON.parse(value);}catch{return [];}};
const EXPIRY=[['7','7 days'],['30','30 days'],['90','90 days'],['180','180 days'],['365','1 year']];
const SCOPES=[['search','Search','Create, cancel and retry search jobs.'],['read','Read','Check job status, read results and usage.']];

export function keyState(item){
  if(item.revoked)return 'revoked';
  const left=daysLeft(item.expires);
  if(left!==null&&left<=0)return 'expired';
  if(left!==null&&left<=14)return 'expiring';
  return 'active';
}
function ExpiryCell({item}){
  const state=keyState(item),left=daysLeft(item.expires);
  if(state==='revoked')return <ToneBadge tone="neutral">Revoked</ToneBadge>;
  if(state==='expired')return <ToneBadge tone="danger">Expired</ToneBadge>;
  return <div className="grid gap-0.5"><ToneBadge tone={state==='expiring'?'warning':'success'}>{state==='expiring'?`Expires in ${left}d`:'Active'}</ToneBadge>{state==='active'&&<span className="text-xs text-muted-foreground">Expires <TimeAgo value={item.expires}/></span>}</div>;
}

function testSnippet(secret){
  const origin=typeof window==='undefined'?'':window.location.origin;
  return `curl ${origin}/v1/usage \\\n  -H "Authorization: Bearer ${secret}"`;
}

// Shows a newly created or rotated key once. The dialog can only close after the user confirms they saved it.
export function KeyRevealDialog({secret,onClose,rotated=false}){
  return <Dialog open={Boolean(secret)} onOpenChange={()=>{}}>
    <DialogContent showCloseButton={false} onInteractOutside={event=>event.preventDefault()} onEscapeKeyDown={event=>event.preventDefault()} className="sm:max-w-xl">
      <DialogHeader><DialogTitle>{rotated?'Your new API key':'Your API key is ready'}</DialogTitle><DialogDescription>{rotated?'The previous key stopped working. Update your backend with this one now.':'Keep it in your backend’s environment variables. Never ship it in browser or mobile code.'}</DialogDescription></DialogHeader>
      {secret&&<SecretReveal secret={secret} label="API key" warning="This is the only time the full key is shown. If you lose it, rotate the key to get a new one." onDone={onClose}>
        <CodeBlock title="Test it from a terminal" language="bash" code={testSnippet(secret)}/>
      </SecretReveal>}
    </DialogContent>
  </Dialog>;
}

export function CreateKeyDialog({open,onOpenChange,projects,defaultProject,onCreated}){
  const {call}=useWorkspace();
  const [project,setProject]=useState(''),[name,setName]=useState('Production'),[days,setDays]=useState('90'),[scopes,setScopes]=useState(['search','read']),[busy,setBusy]=useState(false),[error,setError]=useState(null);
  useEffect(()=>{if(open){setProject(defaultProject||projects[0]?.id||'');setName('Production');setDays('90');setScopes(['search','read']);setError(null);}},[open,defaultProject,projects]);
  const submit=async event=>{
    event.preventDefault();
    if(!scopes.length){setError(new Error('Choose at least one permission.'));return;}
    setBusy(true);setError(null);
    try{const data=await call('/api/keys',{project_id:project,name,days:Number(days),scopes});onOpenChange(false);onCreated(data.secret);}
    catch(failure){setError(failure);}
    finally{setBusy(false);}
  };
  const toggle=(scope,on)=>setScopes(current=>on?[...new Set([...current,scope])]:current.filter(item=>item!==scope));
  return <Dialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next);}}>
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={submit} className="grid gap-5">
        <DialogHeader><DialogTitle>Create an API key</DialogTitle><DialogDescription>Keys belong to one project and expire automatically.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2"><FieldLabel htmlFor="key-name">Name</FieldLabel><Input id="key-name" required autoFocus maxLength={100} placeholder="Production backend" value={name} onChange={event=>setName(event.target.value)}/></Field>
          <Field><FieldLabel htmlFor="key-project">Project</FieldLabel><Select value={project||undefined} onValueChange={setProject}><SelectTrigger id="key-project" className="w-full"><SelectValue placeholder="Select a project"/></SelectTrigger><SelectContent>{projects.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="key-days">Expires after</FieldLabel><Select value={days} onValueChange={setDays}><SelectTrigger id="key-days" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{EXPIRY.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Permissions</legend>
          {SCOPES.map(([scope,label,hint])=><Label key={scope} htmlFor={`scope-${scope}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
            <Checkbox id={`scope-${scope}`} checked={scopes.includes(scope)} onCheckedChange={value=>toggle(scope,value===true)} className="mt-0.5"/>
            <span className="grid gap-0.5"><span className="text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
          </Label>)}
        </fieldset>
        <InlineError error={error}/>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy||!project||!name.trim()}>{busy&&<Spinner/>}{busy?'Creating…':'Create key'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

// The keys table with rename, rotate and revoke. Used on the API keys page and inside a project.
export function KeysTable({keys,loading,error,reload,showProject=true,empty,toolbar}){
  const {call}=useWorkspace();
  const [renaming,setRenaming]=useState(null),[name,setName]=useState(''),[rotating,setRotating]=useState(null),[revoking,setRevoking]=useState(null),[secret,setSecret]=useState(null);
  const columns=[
    {key:'name',header:'Name',cell:item=><div className="grid gap-0.5"><span className={cn('font-medium',item.revoked&&'text-muted-foreground line-through')}>{item.name}</span><code className="text-xs text-muted-foreground">{item.prefix}…</code></div>},
    ...(showProject?[{key:'project',header:'Project',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:item=>item.project}]:[]),
    {key:'scopes',header:'Permissions',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell',cell:item=><div className="flex gap-1">{parseScopes(item.scopes).map(scope=><Badge key={scope} variant="secondary" className="font-mono text-[11px]">{scope}</Badge>)}</div>},
    {key:'used',header:'Last used',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground',cell:item=>item.last_used?<TimeAgo value={item.last_used}/>:'Never'},
    {key:'status',header:'Status',cell:item=><ExpiryCell item={item}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:item=>!item.revoked&&<RowActions items={[
      {label:'Rename',icon:Pencil,onSelect:()=>{setRenaming(item);setName(item.name);}},
      {label:'Rotate key',icon:RefreshCw,onSelect:()=>setRotating(item)},
      'separator',
      {label:'Revoke key',icon:Ban,destructive:true,onSelect:()=>setRevoking(item)},
    ]}/>},
  ];
  return <>
    <DataTable columns={columns} rows={keys} loading={loading} error={error} onRetry={reload} empty={empty} toolbar={toolbar} caption="API keys"/>
    <FormDialog open={Boolean(renaming)} onOpenChange={open=>{if(!open)setRenaming(null);}} title="Rename API key" description="Only the label changes. The key keeps working." submitLabel="Save name"
      onSubmit={async()=>{await call('/api/keys/rename',{id:renaming.id,name});toast.success('Key renamed');await reload({quiet:true});}}>
      <Field><FieldLabel htmlFor="rename-key">Name</FieldLabel><Input id="rename-key" required autoFocus maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></Field>
    </FormDialog>
    <ConfirmDialog open={Boolean(rotating)} onOpenChange={open=>{if(!open)setRotating(null);}} destructive={false} title={`Rotate “${rotating?.name}”?`} description="A new key with the same name, permissions and remaining lifetime is created, and this one stops working immediately." confirmLabel="Rotate key" busyLabel="Rotating…"
      onConfirm={async()=>{const data=await call('/api/keys/rotate',{id:rotating.id});await reload({quiet:true});setSecret(data.secret);}}/>
    <ConfirmDialog open={Boolean(revoking)} onOpenChange={open=>{if(!open)setRevoking(null);}} title={`Revoke “${revoking?.name}”?`} description="Requests using this key start failing immediately. This can’t be undone." confirmLabel="Revoke key" busyLabel="Revoking…"
      onConfirm={async()=>{await call('/api/keys/revoke',{id:revoking.id});toast.success('Key revoked');await reload({quiet:true});}}/>
    <KeyRevealDialog secret={secret} rotated onClose={()=>setSecret(null)}/>
  </>;
}

const STATUS_TABS=[['active','Active'],['revoked','Revoked'],['all','All']];

export function Keys(){
  const {href,takeIntent}=useWorkspace();
  const projects=useResource('/api/projects');
  const keys=useResource('/api/keys');
  const [creating,setCreating]=useState(false),[secret,setSecret]=useState(null),[tab,setTab]=useState('active'),[query,setQuery]=useState('');
  useEffect(()=>{if(takeIntent('keys','create'))setCreating(true);},[takeIntent]);
  const noProjects=projects.data&&!projects.data.projects.length;
  const all=keys.data?.keys;
  const rows=useMemo(()=>all?.filter(item=>(tab==='all'||(tab==='revoked'?item.revoked:!item.revoked))&&matches(item,query,['name','project','prefix'])),[all,tab,query]);
  const expiring=all?.filter(item=>keyState(item)==='expiring').length||0;
  return <>
    <PageHeader title="API keys" description="Keys authenticate your backend. They’re shown once, scoped to a project, and expire automatically."
      actions={<Button type="button" disabled={!projects.data||noProjects} onClick={()=>setCreating(true)}><Plus/>Create API key</Button>}/>
    {expiring>0&&<p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">{expiring} key{expiring===1?' expires':'s expire'} within 14 days. Rotate {expiring===1?'it':'them'} before then to avoid an outage.</p>}
    {noProjects?<EmptyState icon={FolderPlus} title="You need a project first" description="API keys belong to a project, so usage and limits stay separate per application." action={<Button asChild><Link href={href('projects')}><Plus/>Create a project</Link></Button>}/>
    :<KeysTable keys={rows} loading={keys.loading} error={keys.error} reload={keys.reload}
      toolbar={<TableToolbar><Tabs value={tab} onValueChange={setTab}><TabsList className="h-8">{STATUS_TABS.map(([value,label])=><TabsTrigger key={value} value={value} className="text-xs">{label}{value==='active'&&all&&<span className="ml-1 text-muted-foreground tabular-nums">{all.filter(item=>!item.revoked).length}</span>}</TabsTrigger>)}</TabsList></Tabs><SearchInput value={query} onChange={setQuery} placeholder="Search keys…"/></TableToolbar>}
      empty={query?<EmptyState icon={Search} title="No matching keys" description={`No keys match “${query}”.`}/>
        :tab==='revoked'?<EmptyState icon={KeyRound} title="No revoked keys" description="Keys you revoke or rotate out will be listed here."/>
        :<EmptyState icon={KeyRound} title="No API keys yet" description="Create a key to call the Pluko API from your backend." action={<Button onClick={()=>setCreating(true)}><Plus/>Create API key</Button>}/>}/>}
    <CreateKeyDialog open={creating} onOpenChange={setCreating} projects={projects.data?.projects||[]} onCreated={async value=>{setSecret(value);await keys.reload({quiet:true});}}/>
    <KeyRevealDialog secret={secret} onClose={()=>{setSecret(null);toast.success('API key created');}}/>
  </>;
}
