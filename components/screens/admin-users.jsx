'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ExternalLink,KeyRound,ShieldCheck,UserCheck,UserPlus,UserX,UsersRound} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,DataTable,FormDialog,InfoDialog,PageHeader,RowActions,SecretReveal,StatCard,StatGridSkeleton,StatusBadge,TimeAgo,ToneBadge,toast,StatGrid} from '@/components/workspace/ui';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {initials} from '@/lib/ui-helpers';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';

const DEFAULTS={sort:'created_desc'};
const FILTERS=[
  {id:'role',label:'Role',type:'multi',options:[['admin','Administrator'],['user','Customer']]},
  {id:'status',label:'Status',type:'select',anyLabel:'Any status',options:[['active','Active'],['suspended','Suspended']]},
  {id:'mfa',label:'Two-step',type:'select',anyLabel:'Any',options:[['on','Two-step on'],['off','Two-step off']]},
  {id:'active_within',label:'Last active',type:'select',anyLabel:'Any time',options:[['day','In the last 24 hours'],['week','In the last 7 days'],['month','In the last 30 days'],['dormant','Not for 30+ days'],['never','Never signed in']]},
  {id:'has_projects',label:'Projects',type:'select',anyLabel:'Any',options:[['yes','Has projects'],['no','No projects']]},
  {id:'created',label:'Joined',type:'date'},
];

/** Reset links, suspend and reactivate: shared by the Users list and a user's own page. */
export function useUserActions(onDone){
  const {call}=useWorkspace();
  const [link,setLink]=useState(null),[status,setStatus]=useState(null);
  const reset=async user=>{try{const data=await call('/api/admin/reset',{id:user.id});setLink({kind:'reset',email:user.email,url:data.link});}catch(failure){toast.error(failure.message);}};
  const dialogs=<>
    <InfoDialog open={Boolean(link)} onOpenChange={open=>{if(!open)setLink(null);}} dismissible={false} title={link?.kind==='invite'?'Invitation ready':'Password reset link ready'} description={link?`For ${link.email}. It works once and expires in ${link.kind==='invite'?'24 hours':'30 minutes'}.`:''}>
      {link&&<SecretReveal secret={link.url} label="Link" warning="Anyone with this link can set the account’s password. Send it privately." onDone={()=>{setLink(null);toast.success(link.kind==='invite'?'Invitation created':'Reset link created');}}/>}
    </InfoDialog>
    <ConfirmDialog open={Boolean(status)} onOpenChange={open=>{if(!open)setStatus(null);}} destructive={Boolean(status?.active)}
      title={status?.active?`Suspend ${status?.email}?`:`Reactivate ${status?.email}?`}
      description={status?.active?'They’re signed out everywhere and their running jobs are cancelled. You can reactivate them later.':'They’ll be able to sign in again with their existing password.'}
      confirmLabel={status?.active?'Suspend account':'Reactivate account'} busyLabel="Saving…"
      onConfirm={async()=>{await call('/api/admin/user',{id:status.id,active:!status.active});toast.success(status.active?'Account suspended':'Account reactivated');await onDone?.();}}/>
  </>;
  return {reset,toggle:setStatus,showLink:setLink,dialogs};
}

export function AdminUsers(){
  const {me,call,takeIntent,navigate,href}=useWorkspace();
  const list=useListQuery('/api/admin/users',{id:'users',itemsKey:'users',filters:FILTERS,defaults:DEFAULTS});
  const stats=useResource('/api/admin/user-stats');
  const refresh=async()=>{await Promise.all([list.reload({quiet:true}),stats.reload({quiet:true})]);};
  const actions=useUserActions(refresh);
  const [inviting,setInviting]=useState(false),[email,setEmail]=useState('');
  useEffect(()=>{if(takeIntent('users','invite')){setEmail('');setInviting(true);}},[takeIntent]);
  const totals=stats.data?.stats;

  const columns=[
    {key:'email',header:'User',sortKey:'email',sortFirst:'asc',cell:user=><div className="flex min-w-0 items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-muted text-xs">{initials(user.email)}</AvatarFallback></Avatar><div className="grid min-w-0"><Link href={href('users',user.id)} onClick={event=>event.stopPropagation()} className="truncate font-medium hover:underline">{user.email}{user.id===me.id&&<span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</Link><span className="text-xs text-muted-foreground capitalize">{user.role==='admin'?'Administrator':'Customer'}</span></div></div>},
    {key:'status',header:'Status',cell:user=><StatusBadge status={user.active?'active':'suspended'}/>},
    {key:'mfa',header:'Two-step',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:user=>user.mfa?<ToneBadge tone="success">On</ToneBadge>:<ToneBadge tone="warning">Off</ToneBadge>},
    {key:'projects',header:'Projects',sortKey:'projects',headClassName:'hidden sm:table-cell text-right',className:'hidden sm:table-cell text-right tabular-nums',cell:user=>user.projects},
    {key:'jobs',header:'Jobs',sortKey:'jobs',headClassName:'hidden lg:table-cell text-right',className:'hidden lg:table-cell text-right tabular-nums',cell:user=>user.jobs.toLocaleString()},
    {key:'last_login',header:'Last active',sortKey:'last_login',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell text-muted-foreground whitespace-nowrap',cell:user=>user.last_login?<TimeAgo value={user.last_login}/>:'Never'},
    {key:'created',header:'Joined',sortKey:'created',headClassName:'hidden xl:table-cell',className:'hidden xl:table-cell text-muted-foreground whitespace-nowrap',cell:user=><TimeAgo value={user.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:user=><RowActions items={[
      {label:'Open account',icon:ExternalLink,onSelect:()=>navigate('users',user.id)},
      user.id!==me.id&&{label:'Create reset link',icon:KeyRound,onSelect:()=>actions.reset(user)},
      user.id!==me.id&&'separator',
      user.id!==me.id&&(user.active?{label:'Suspend account',icon:UserX,destructive:true,onSelect:()=>actions.toggle(user)}:{label:'Reactivate account',icon:UserCheck,onSelect:()=>actions.toggle(user)}),
    ]}/>},
  ];
  return <>
    <PageHeader title="Users & invites" description="Find any account, open its activity, issue reset links and suspend access." actions={<Button type="button" onClick={()=>{setEmail('');setInviting(true);}}><UserPlus/>Invite user</Button>}/>
    {!totals?<StatGridSkeleton count={4}/>:<StatGrid>
      <StatCard label="Users" value={totals.total.toLocaleString()} icon={UsersRound} hint={`${totals.new_week} joined in the last 7 days`}/>
      <StatCard label="Active" value={totals.active.toLocaleString()} icon={UserCheck} hint={`${totals.admins} ${totals.admins===1?'administrator':'administrators'}`}/>
      <StatCard label="Suspended" value={totals.suspended.toLocaleString()} icon={UserX}/>
      <StatCard label="Two-step on" value={`${totals.total?Math.round(totals.mfa_on/totals.total*100):0}%`} icon={ShieldCheck} hint={`${totals.total-totals.mfa_on} without an authenticator`}/>
    </StatGrid>}
    <DataTable columns={columns} rows={list.items} loading={list.loading} error={list.error} onRetry={()=>list.reload()} caption="Users"
      sort={list.sort} onSort={list.setSort} onRowClick={user=>navigate('users',user.id)}
      toolbar={<FilterBar list={list} placeholder="Search by email or ID…"/>}
      empty={<ListEmpty list={list} icon={UserPlus} title="It’s just you so far" description="Invite teammates or customers. Each person gets a one-time link to set their own password." action={<Button className="rounded-full px-4" onClick={()=>{setEmail('');setInviting(true);}}><UserPlus/>Invite someone</Button>}/>}
      footer={<Pagination list={list} label="users"/>}/>
    <FormDialog open={inviting} onOpenChange={setInviting} title="Invite a user" description="Pluko creates a one-time link that’s valid for 24 hours. Share it over a secure channel." submitLabel="Create invitation" busyLabel="Creating…"
      onSubmit={async()=>{const data=await call('/api/admin/invite',{email});actions.showLink({kind:'invite',email,url:data.link});await refresh();}}>
      <Field><FieldLabel htmlFor="invite-email">Email address</FieldLabel><Input id="invite-email" type="email" required autoFocus placeholder="person@company.com" value={email} onChange={event=>setEmail(event.target.value)}/><FieldDescription>They’ll choose their own password when they open the link.</FieldDescription></Field>
    </FormDialog>
    {actions.dialogs}
  </>;
}
