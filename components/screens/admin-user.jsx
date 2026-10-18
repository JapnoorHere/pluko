'use client';
import {useEffect} from 'react';
import {Activity,AlertTriangle,Copy,FolderKanban,Gauge,KeyRound,MessageSquareWarning,Search,UserCheck,UserX} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,DescriptionList,ErrorState,PageHeader,StatCard,StatGrid,StatGridSkeleton,StatusBadge,TimeAgo,ToneBadge,copyWithToast,Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/workspace/ui';
import {useUserActions} from '@/components/screens/admin-users';
import {JobsList} from '@/components/screens/jobs';
import {LogsList} from '@/components/screens/logs';
import {KeysList} from '@/components/screens/keys';
import {Projects} from '@/components/screens/projects';
import {AuditList} from '@/components/screens/admin-audit';
import {format} from '@/lib/display';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

const TABS=[['overview','Overview'],['projects','Projects'],['keys','API keys'],['jobs','Search jobs'],['logs','Request logs'],['audit','Audit']];

/** One customer or administrator: profile, activity totals, and every list filtered to this account. */
export function UserPage(){
  const {route,navigate,href,me,setCrumb}=useWorkspace();
  const summary=useResource(`/api/admin/users/${encodeURIComponent(route.id)}`);
  const user=summary.data?.user,stats=summary.data?.stats;
  const actions=useUserActions(()=>summary.reload({quiet:true}));
  useEffect(()=>{if(user)setCrumb?.(user.email);},[user,setCrumb]);
  const fixed={user_id:route.id};

  if(summary.error)return <>
    <PageHeader title="Account" back={{href:href('users'),label:'Users'}}/>
    <ErrorState error={summary.error} onRetry={()=>summary.reload()} title="Couldn’t load this account"/>
  </>;
  if(!user)return <><CardSkeleton lines={2}/><StatGridSkeleton count={4}/></>;

  const self=user.id===me.id;
  return <>
    <PageHeader back={{href:href('users'),label:'Users'}} title={user.email}
      eyebrow={<><StatusBadge status={user.active?'active':'suspended'}/><ToneBadge tone={user.role==='admin'?'info':'neutral'}>{user.role==='admin'?'Administrator':'Customer'}</ToneBadge>{user.mfa?<ToneBadge tone="success">Two-step on</ToneBadge>:<ToneBadge tone="warning">Two-step off</ToneBadge>}</>}
      description={<>Joined {format(user.created)} · {user.last_login?<>last signed in <TimeAgo value={user.last_login}/></>:'never signed in'}</>}
      actions={<>
        <Button type="button" variant="outline" onClick={()=>copyWithToast(user.id,'User ID')}><Copy/>Copy ID</Button>
        {!self&&<Button type="button" variant="outline" onClick={()=>actions.reset(user)}><KeyRound/>Reset link</Button>}
        {!self&&(user.active
          ?<Button type="button" variant="destructive" onClick={()=>actions.toggle(user)}><UserX/>Suspend</Button>
          :<Button type="button" onClick={()=>actions.toggle(user)}><UserCheck/>Reactivate</Button>)}
      </>}/>

    <StatGrid>
      <StatCard label="Projects" value={stats.projects} icon={FolderKanban} hint={`${stats.active_keys} active ${stats.active_keys===1?'key':'keys'}`}/>
      <StatCard label="Search jobs" value={stats.jobs.toLocaleString()} icon={Search} hint={stats.active_jobs?`${stats.active_jobs} running or queued`:'None running'}/>
      <StatCard label="API calls, 30 days" value={stats.requests_30d.toLocaleString()} icon={Activity} tone={stats.errors_30d&&stats.errors_30d*10>=stats.requests_30d?'danger':undefined} hint={`${stats.errors_30d.toLocaleString()} with status 400 or above`}/>
      <StatCard label="Pages today" value={stats.pages_today.toLocaleString()} icon={Gauge} hint={stats.last_request?<>Last request <TimeAgo value={stats.last_request}/></>:'No requests yet'}/>
    </StatGrid>

    <Tabs value={route.tab} onValueChange={tab=>navigate('users',user.id,tab)}>
      <TabsList variant="line" className="h-9 w-full justify-start overflow-x-auto overflow-y-hidden border-b">{TABS.map(([value,label])=><TabsTrigger key={value} value={value} className="flex-none">{label}</TabsTrigger>)}</TabsList>
    </Tabs>

    {route.tab==='overview'&&<div className="grid gap-6 lg:grid-cols-5">
      <div className="grid content-start gap-4 lg:col-span-2">
        <DescriptionList items={[
          ['Email',user.email],
          ['User ID',<span key="id" className="font-mono text-xs break-all">{user.id}</span>],
          ['Role',user.role==='admin'?'Administrator':'Customer'],
          ['Status',user.active?'Active':'Suspended'],
          ['Two-step',user.mfa?'On':'Off'],
          ['Signed-in sessions',stats.sessions],
          ['Open feedback',stats.open_feedback],
        ]}/>
        {!user.active&&<p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-4 shrink-0"/>This account is suspended. Its API keys are refused and it can’t sign in.</p>}
        {stats.open_feedback>0&&<p className="flex gap-2 rounded-lg border px-4 py-3 text-sm text-muted-foreground"><MessageSquareWarning className="mt-0.5 size-4 shrink-0"/>{stats.open_feedback} result {stats.open_feedback===1?'report is':'reports are'} waiting for review.</p>}
      </div>
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Things this account did, and changes made to it.</CardDescription></CardHeader>
        <CardContent className="grid gap-3"><AuditList fixed={{user:user.id}} compact pageSize={10}/>
          <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={()=>navigate('users',user.id,'audit')}>See all activity</Button>
        </CardContent>
      </Card>
    </div>}
    {route.tab==='projects'&&<Projects fixed={fixed} embedded/>}
    {route.tab==='keys'&&<KeysList fixed={fixed}/>}
    {route.tab==='jobs'&&<JobsList fixed={fixed}/>}
    {route.tab==='logs'&&<LogsList fixed={fixed}/>}
    {route.tab==='audit'&&<AuditList fixed={{user:user.id}}/>}
    {actions.dialogs}
  </>;
}
