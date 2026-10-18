'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Ban,FolderPlus,KeyRound,Pencil,Plus,RefreshCw,Search} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {useOwnedOptions} from '@/components/screens/jobs';
import {useReturnFocus} from '@/components/design/system';
import {CodeBlock,ConfirmDialog,DataTable,EmptyState,FormDialog,InlineError,PageHeader,RowActions,SecretReveal,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {daysLeft} from '@/lib/display';
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
  // How much of the key's lifetime is used up, like the retention bars on the limits page.
  const lifetime=Math.max(1,item.expires-item.created),used=Math.min(100,Math.max(0,((Date.now()-item.created)/lifetime)*100));
  return <div className="grid w-40 gap-1.5">
    <div className="flex items-center justify-between gap-2"><ToneBadge tone={state==='expiring'?'warning':'success'}>{state==='expiring'?'Expiring':'Active'}</ToneBadge><span className="text-xs text-muted-foreground tabular-nums">{left}d left</span></div>
    <div className="h-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(used)}% of this key’s lifetime used`}><div className={state==='expiring'?'h-full rounded-full bg-amber-500':'h-full rounded-full bg-brand'} style={{width:`${used}%`}}/></div>
  </div>;
}

function testSnippet(secret){
  const origin=typeof window==='undefined'?'':window.location.origin;
  return `curl ${origin}/v1/usage \\\n  -H "Authorization: Bearer ${secret}"`;
}

// Shows a newly created or rotated key once. The dialog can only close after the user confirms they saved it.
export function KeyRevealDialog({secret,onClose,rotated=false}){
  const returnFocus=useReturnFocus(Boolean(secret));
  return <Dialog open={Boolean(secret)} onOpenChange={()=>{}}>
    <DialogContent onCloseAutoFocus={returnFocus} showCloseButton={false} onInteractOutside={event=>event.preventDefault()} onEscapeKeyDown={event=>event.preventDefault()} className="sm:max-w-xl">
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
  const returnFocus=useReturnFocus(open);
  return <Dialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next);}}>
    <DialogContent onCloseAutoFocus={returnFocus} className="sm:max-w-lg">
      <form onSubmit={submit} className="grid gap-5">
        <DialogHeader><DialogTitle>Create an API key</DialogTitle><DialogDescription>Keys belong to one project and expire automatically.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2"><FieldLabel htmlFor="key-name">Name</FieldLabel><Input id="key-name" required autoFocus maxLength={100} placeholder="Production backend" value={name} onChange={event=>setName(event.target.value)}/></Field>
          <Field><FieldLabel htmlFor="key-project">Project</FieldLabel><Select value={project||undefined} onValueChange={setProject}><SelectTrigger id="key-project" className="w-full"><SelectValue placeholder="Select a project"/></SelectTrigger><SelectContent>{projects.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="key-days">Expires after</FieldLabel><Select value={days} onValueChange={setDays}><SelectTrigger id="key-days" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{EXPIRY.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Permissions</legend>
          {SCOPES.map(([scope,label,hint])=><Label key={scope} htmlFor={`scope-${scope}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-brand/50 has-[[data-state=checked]]:bg-brand/5">
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
export function KeysTable({keys,loading,error,reload,showProject=true,showOwner=false,empty,toolbar,footer,sort,onSort}){
  const {call}=useWorkspace();
  const [renaming,setRenaming]=useState(null),[name,setName]=useState(''),[rotating,setRotating]=useState(null),[revoking,setRevoking]=useState(null),[secret,setSecret]=useState(null);
  const columns=[
    {key:'name',header:'Name',sortKey:'name',sortFirst:'asc',cell:item=><div className="grid gap-0.5"><span className={cn('font-medium',item.revoked&&'text-muted-foreground line-through')}>{item.name}</span><code className="text-xs text-muted-foreground">{item.prefix}…</code></div>},
    ...(showOwner?[{key:'owner',header:'Account',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell max-w-44 truncate text-muted-foreground',cell:item=>item.owner}]:[]),
    ...(showProject?[{key:'project',header:'Project',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:item=>item.project}]:[]),
    {key:'scopes',header:'Permissions',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell',cell:item=><div className="flex gap-1">{parseScopes(item.scopes).map(scope=><Badge key={scope} variant="secondary" className="font-mono text-[11px]">{scope}</Badge>)}</div>},
    {key:'used',header:'Last used',sortKey:'last_used',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground',cell:item=>item.last_used?<TimeAgo value={item.last_used}/>:'Never'},
    {key:'status',header:'Expires',sortKey:'expires',sortFirst:'asc',cell:item=><ExpiryCell item={item}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:item=>!item.revoked&&<RowActions items={[
      {label:'Rename',icon:Pencil,onSelect:()=>{setRenaming(item);setName(item.name);}},
      {label:'Rotate key',icon:RefreshCw,onSelect:()=>setRotating(item)},
      'separator',
      {label:'Revoke key',icon:Ban,destructive:true,onSelect:()=>setRevoking(item)},
    ]}/>},
  ];
  return <>
    <DataTable columns={columns} rows={keys} loading={loading} error={error} onRetry={reload} empty={empty} toolbar={toolbar} footer={footer} sort={sort} onSort={onSort} caption="API keys"/>
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

const STATUS_OPTIONS=[['active','Active'],['expiring','Expiring within 7 days'],['expired','Expired'],['revoked','Revoked']];
const USE_OPTIONS=[['day','Used in the last 24 hours'],['week','Used in the last 7 days'],['inactive','Not used for 30+ days'],['never','Never used']];
const DEFAULTS={sort:'created_desc'};

/**
 * The key table with filters and pages. `fixed` locks hidden filters such as {user_id}; bump `version` to reload
 * after changes made elsewhere on the page (e.g. creating a key). `onChange` runs after a rename, rotation or revoke.
 */
export function KeysList({fixed={},showOwner=false,version=0,onChange,emptyAction}){
  const {me}=useWorkspace();
  const admin=me.role==='admin';
  const {projects}=useOwnedOptions(fixed.user_id);
  const filters=useMemo(()=>[
    {id:'status',label:'Status',type:'multi',options:STATUS_OPTIONS},
    {id:'project_id',label:'Project',type:'select',anyLabel:'Any project',options:projects.map(p=>[p.id,admin&&!fixed.user_id?`${p.name} · ${p.owner}`:p.name])},
    {id:'scope',label:'Permission',type:'multi',options:[['search','search'],['read','read']]},
    {id:'used',label:'Last used',type:'select',anyLabel:'Any time',options:USE_OPTIONS},
    {id:'created',label:'Created',type:'date'},
  ],[projects,admin,fixed.user_id]);
  const list=useListQuery('/api/keys',{id:'keys',itemsKey:'keys',filters,defaults:DEFAULTS,fixed});
  const {reload}=list;
  const first=useRef(true);
  useEffect(()=>{if(first.current){first.current=false;return;}reload({quiet:true});},[version,reload]);
  const reloadAll=async options=>{await reload(options);await onChange?.();};
  return <KeysTable keys={list.items} loading={list.loading} error={list.error} reload={reloadAll} showOwner={showOwner}
    sort={list.sort} onSort={list.setSort}
    toolbar={<FilterBar list={list} placeholder="Search names or key prefixes…"/>}
    footer={<Pagination list={list} label="keys"/>}
    empty={<ListEmpty list={list} icon={KeyRound} title={fixed.user_id?'No API keys':'No API keys yet'} description={fixed.user_id?'This account hasn’t created any keys.':'Create a key to call the Pluko API from your backend.'} action={emptyAction}/>}/>;
}

export function Keys(){
  const {href,takeIntent,me}=useWorkspace();
  const admin=me.role==='admin';
  const projects=useResource('/api/projects');
  // The full list powers the "expiring soon" warning; the table itself is paginated on the server.
  const everyKey=useResource('/api/keys');
  const [creating,setCreating]=useState(false),[secret,setSecret]=useState(null),[version,setVersion]=useState(0);
  useEffect(()=>{if(takeIntent('keys','create'))setCreating(true);},[takeIntent]);
  const noProjects=projects.data&&!projects.data.projects.length;
  const expiring=everyKey.data?.keys?.filter(item=>keyState(item)==='expiring').length||0;
  return <>
    <PageHeader title="API keys" description={admin?'Every API key on this Pluko instance, across all accounts.':'Keys authenticate your backend. They’re shown once, scoped to a project, and expire automatically.'}
      actions={<Button type="button" disabled={!projects.data||noProjects} onClick={()=>setCreating(true)}><Plus/>Create API key</Button>}/>
    {expiring>0&&<p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">{expiring} key{expiring===1?' expires':'s expire'} within 14 days. Rotate {expiring===1?'it':'them'} before then to avoid an outage.</p>}
    {noProjects?<EmptyState icon={FolderPlus} title="You need a project first" description="API keys belong to a project, so usage and limits stay separate per application." action={<Button asChild><Link href={href('projects')}><Plus/>Create a project</Link></Button>}/>
    :<KeysList showOwner={admin} version={version} onChange={()=>everyKey.reload({quiet:true})} emptyAction={<Button onClick={()=>setCreating(true)}><Plus/>Create API key</Button>}/>}
    <CreateKeyDialog open={creating} onOpenChange={setCreating} projects={projects.data?.projects||[]} onCreated={async value=>{setSecret(value);setVersion(v=>v+1);await everyKey.reload({quiet:true});}}/>
    <KeyRevealDialog secret={secret} onClose={()=>{setSecret(null);toast.success('API key created');}}/>
  </>;
}
