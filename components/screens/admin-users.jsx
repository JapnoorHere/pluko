'use client';
import {useEffect,useMemo,useState} from 'react';
import {KeyRound,Search,ShieldCheck,UserCheck,UserPlus,UserX,UsersRound} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,DataTable,EmptyState,FormDialog,InfoDialog,PageHeader,RowActions,SearchInput,SecretReveal,StatCard,StatGridSkeleton,StatusBadge,TableToolbar,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {initials,matches} from '@/lib/ui-helpers';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

export function AdminUsers(){
  const {me,call,takeIntent}=useWorkspace();
  const users=useResource('/api/admin/users');
  const [inviting,setInviting]=useState(false),[email,setEmail]=useState(''),[link,setLink]=useState(null),[status,setStatus]=useState(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  useEffect(()=>{if(takeIntent('users','invite')){setEmail('');setInviting(true);}},[takeIntent]);
  const list=users.data?.users;
  const rows=useMemo(()=>list?.filter(user=>matches(user,query,['email','id'])&&(filter==='all'||(filter==='admin'?user.role==='admin':filter==='suspended'?!user.active:filter==='no-mfa'?!user.mfa:true))),[list,query,filter]);
  const reset=async user=>{try{const data=await call('/api/admin/reset',{id:user.id});setLink({kind:'reset',email:user.email,url:data.link});}catch(failure){toast.error(failure.message);}};

  const columns=[
    {key:'email',header:'User',cell:user=><div className="flex min-w-0 items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-muted text-xs">{initials(user.email)}</AvatarFallback></Avatar><div className="grid min-w-0"><span className="truncate font-medium">{user.email}{user.id===me.id&&<span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</span><span className="text-xs text-muted-foreground capitalize">{user.role}</span></div></div>},
    {key:'status',header:'Status',cell:user=><StatusBadge status={user.active?'active':'suspended'}/>},
    {key:'mfa',header:'Two-step',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:user=>user.mfa?<ToneBadge tone="success">On</ToneBadge>:<ToneBadge tone="warning">Off</ToneBadge>},
    {key:'projects',header:'Projects',headClassName:'hidden sm:table-cell text-right',className:'hidden sm:table-cell text-right tabular-nums',cell:user=>user.projects},
    {key:'created',header:'Joined',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell text-muted-foreground',cell:user=><TimeAgo value={user.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:user=>user.id!==me.id&&<RowActions items={[
      {label:'Create reset link',icon:KeyRound,onSelect:()=>reset(user)},
      'separator',
      user.active?{label:'Suspend account',icon:UserX,destructive:true,onSelect:()=>setStatus(user)}:{label:'Reactivate account',icon:UserCheck,onSelect:()=>setStatus(user)},
    ]}/>},
  ];
  return <>
    <PageHeader title="Users & invites" description="Invite people, issue password reset links, and suspend access." actions={<Button type="button" onClick={()=>{setEmail('');setInviting(true);}}><UserPlus/>Invite user</Button>}/>
    {!list?<StatGridSkeleton count={4}/>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Users" value={list.length} icon={UsersRound}/>
      <StatCard label="Active" value={list.filter(user=>user.active).length} icon={UserCheck}/>
      <StatCard label="Suspended" value={list.filter(user=>!user.active).length} icon={UserX}/>
      <StatCard label="Two-step on" value={`${list.length?Math.round(list.filter(user=>user.mfa).length/list.length*100):0}%`} icon={ShieldCheck} hint={`${list.filter(user=>!user.mfa).length} without an authenticator`}/>
    </div>}
    <DataTable columns={columns} rows={rows} loading={users.loading} error={users.error} onRetry={users.reload} caption="Users"
      toolbar={<TableToolbar><SearchInput value={query} onChange={setQuery} placeholder="Search by email…"/><Select value={filter} onValueChange={setFilter}><SelectTrigger size="sm" className="w-44" aria-label="Filter users"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem><SelectItem value="admin">Administrators</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="no-mfa">Two-step off</SelectItem></SelectContent></Select></TableToolbar>}
      empty={<EmptyState icon={Search} title="No matching users" description="Try another search or filter." action={<Button variant="outline" onClick={()=>{setQuery('');setFilter('all');}}>Clear filters</Button>}/>}/>

    <FormDialog open={inviting} onOpenChange={setInviting} title="Invite a user" description="Pluko creates a one-time link that’s valid for 24 hours. Share it over a secure channel." submitLabel="Create invitation" busyLabel="Creating…"
      onSubmit={async()=>{const data=await call('/api/admin/invite',{email});setLink({kind:'invite',email,url:data.link});await users.reload({quiet:true});}}>
      <Field><FieldLabel htmlFor="invite-email">Email address</FieldLabel><Input id="invite-email" type="email" required autoFocus placeholder="person@company.com" value={email} onChange={event=>setEmail(event.target.value)}/><FieldDescription>They’ll choose their own password when they open the link.</FieldDescription></Field>
    </FormDialog>
    <InfoDialog open={Boolean(link)} onOpenChange={open=>{if(!open)setLink(null);}} dismissible={false} title={link?.kind==='invite'?'Invitation ready':'Password reset link ready'} description={link?`For ${link.email}. It works once and expires in ${link.kind==='invite'?'24 hours':'30 minutes'}.`:''}>
      {link&&<SecretReveal secret={link.url} label="Link" warning="Anyone with this link can set the account’s password. Send it privately." onDone={()=>{setLink(null);toast.success(link.kind==='invite'?'Invitation created':'Reset link created');}}/>}
    </InfoDialog>
    <ConfirmDialog open={Boolean(status)} onOpenChange={open=>{if(!open)setStatus(null);}} destructive={Boolean(status?.active)}
      title={status?.active?`Suspend ${status?.email}?`:`Reactivate ${status?.email}?`}
      description={status?.active?'They’re signed out everywhere and their running jobs are cancelled. You can reactivate them later.':'They’ll be able to sign in again with their existing password.'}
      confirmLabel={status?.active?'Suspend account':'Reactivate account'} busyLabel="Saving…"
      onConfirm={async()=>{await call('/api/admin/user',{id:status.id,active:!status.active});toast.success(status.active?'Account suspended':'Account reactivated');await users.reload({quiet:true});}}/>
  </>;
}
