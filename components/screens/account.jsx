'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Download,KeyRound,Laptop,LogOut,Monitor,Moon,Palette,ShieldAlert,ShieldCheck,Sun,Trash2,UserRound,Database,MonitorSmartphone} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {ConfirmDialog,CopyField,DataTable,DescriptionList,FormDialog,PageHeader,PasswordInput,SecretReveal,StatusBadge,TimeAgo,ToneBadge,toast} from '@/components/workspace/ui';
import {downloadText} from '@/lib/display';
import {initials} from '@/lib/ui-helpers';
import {cn} from '@/lib/utils';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardAction,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/ui/card';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';

const TABS=[['profile','Profile',UserRound],['security','Security',ShieldCheck],['sessions','Sessions',MonitorSmartphone],['appearance','Appearance',Palette],['data','Data & privacy',Database]];

function CodeInput({id,value,onChange}){
  return <Input id={id} required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" className="font-mono tracking-[0.3em]" value={value} onChange={event=>onChange(event.target.value.replace(/\D/g,'').slice(0,6))}/>;
}

function Profile(){
  const {me,href}=useWorkspace();
  return <div className="grid gap-6">
    <Card>
      <CardHeader><CardTitle>Your profile</CardTitle><CardDescription>How you appear in Pluko and in audit history.</CardDescription></CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-4"><Avatar className="size-14 rounded-xl"><AvatarFallback className="rounded-xl bg-brand/15 text-lg font-semibold text-brand">{initials(me.email)}</AvatarFallback></Avatar><div><p className="font-medium">{me.email}</p><p className="text-sm text-muted-foreground">{me.role==='admin'?'Administrator':'Customer'} account</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><CopyField value={me.email} label="Email address" description="Email changes aren’t supported yet."/><CopyField value={me.id} label="Account ID" description="Share this with support if you need help."/></div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Security at a glance</CardTitle></CardHeader>
      <CardContent><DescriptionList items={[['Authenticator',me.mfa?<StatusBadge key="m" status="enabled" label="On"/>:<ToneBadge key="m" tone="warning">Off</ToneBadge>],['Role',<span key="r" className="capitalize">{me.role}</span>]]}/></CardContent>
      <CardFooter className="justify-end"><Button asChild size="sm" variant="outline"><Link href={href('account','','security')}>Manage security</Link></Button></CardFooter>
    </Card>
  </div>;
}

function MfaSetupDialog({open,onOpenChange,details,onEnabled}){
  const {call}=useWorkspace();
  const [code,setCode]=useState('');
  return <FormDialog open={open} onOpenChange={next=>{if(!next)setCode('');onOpenChange(next);}} title="Set up your authenticator" description="Works with Google Authenticator, 1Password, Authy and any app that supports TOTP." submitLabel="Turn on" busyLabel="Checking…" submitDisabled={code.length!==6}
    onSubmit={async()=>{await call('/api/mfa/enable',{code});toast.success('Authenticator turned on');setCode('');await onEnabled();}}>
    <ol className="grid gap-4 text-sm">
      <li className="grid gap-2"><span className="font-medium">1. Add Pluko to your app</span><span className="text-muted-foreground">Choose “Enter a setup key” in your authenticator and paste this key. On a phone you can open the link instead.</span>
        {details&&<CopyField value={details.secret} label="Setup key"/>}
        {details?.uri&&<Button type="button" variant="outline" size="sm" asChild className="justify-self-start"><a href={details.uri}>Open in authenticator app</a></Button>}
      </li>
      <li className="grid gap-2"><span className="font-medium">2. Enter the six-digit code</span><Field><FieldLabel htmlFor="mfa-code" className="sr-only">Six-digit code</FieldLabel><CodeInput id="mfa-code" value={code} onChange={setCode}/></Field></li>
    </ol>
  </FormDialog>;
}

function Security({required}){
  const {me,call,refreshMe}=useWorkspace();
  const [setup,setSetup]=useState(null),[starting,setStarting]=useState(false),[disabling,setDisabling]=useState(false),[changing,setChanging]=useState(false);
  const [password,setPassword]=useState(''),[code,setCode]=useState(''),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState('');
  const start=async()=>{setStarting(true);try{setSetup(await call('/api/mfa/setup',{}));}catch(failure){toast.error(failure.message);}finally{setStarting(false);}};
  return <div className="grid gap-6">
    {required&&<Alert className="border-amber-500/30 bg-amber-500/5"><ShieldAlert className="text-amber-500"/><AlertTitle>Turn on your authenticator to continue</AlertTitle><AlertDescription>Administrator accounts need two-step verification before they can use any operational controls.</AlertDescription></Alert>}
    <Card>
      <CardHeader><CardTitle>Two-step verification</CardTitle><CardDescription>Ask for a code from your authenticator app every time you sign in.</CardDescription><CardAction>{me.mfa?<StatusBadge status="enabled" label="On"/>:<ToneBadge tone="warning">Off</ToneBadge>}</CardAction></CardHeader>
      <CardContent><div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4"><ShieldCheck className={cn('mt-0.5 size-5 shrink-0',me.mfa?'text-emerald-500':'text-muted-foreground')}/><p className="text-sm text-muted-foreground">{me.mfa?'Your account is protected. Signing in needs your password and a code from your authenticator app.':'Anyone with your password can sign in. We recommend turning this on for every account.'}</p></div></CardContent>
      <CardFooter className="justify-end">{me.mfa?(me.role==='admin'?<span className="text-xs text-muted-foreground">Required for administrators.</span>:<Button type="button" size="sm" variant="outline" onClick={()=>setDisabling(true)}>Turn off</Button>):<Button type="button" size="sm" disabled={starting} onClick={start}>{starting&&<Spinner/>}Set up authenticator</Button>}</CardFooter>
    </Card>
    <Card>
      <CardHeader><CardTitle>Password</CardTitle><CardDescription>Use at least 12 characters. Changing it signs out every other device.</CardDescription></CardHeader>
      <CardFooter className="justify-end"><Button type="button" size="sm" variant="outline" onClick={()=>{setCurrent('');setNext('');setConfirm('');setChanging(true);}}><KeyRound/>Change password</Button></CardFooter>
    </Card>
    <MfaSetupDialog open={Boolean(setup)} onOpenChange={open=>{if(!open)setSetup(null);}} details={setup} onEnabled={async()=>{setSetup(null);await refreshMe();}}/>
    <FormDialog open={disabling} onOpenChange={open=>{setDisabling(open);if(!open){setPassword('');setCode('');}}} title="Turn off two-step verification?" description="Anyone with your password will be able to sign in. Confirm with your password and a current code." submitLabel="Turn off" busyLabel="Turning off…" destructive
      onSubmit={async()=>{await call('/api/mfa/disable',{password,code});toast.success('Authenticator turned off');await refreshMe();}}>
      <Field><FieldLabel htmlFor="mfa-off-password">Password</FieldLabel><PasswordInput id="mfa-off-password" value={password} onChange={setPassword}/></Field>
      <Field><FieldLabel htmlFor="mfa-off-code">Authenticator code</FieldLabel><CodeInput id="mfa-off-code" value={code} onChange={setCode}/></Field>
    </FormDialog>
    <FormDialog open={changing} onOpenChange={setChanging} title="Change password" description="Other devices are signed out when you save." submitLabel="Change password" busyLabel="Saving…" submitDisabled={next.length<12||next!==confirm}
      onSubmit={async()=>{await call('/api/password',{current_password:current,password:next});toast.success('Password changed. Other devices were signed out.');}}>
      <Field><FieldLabel htmlFor="current-password">Current password</FieldLabel><PasswordInput id="current-password" value={current} onChange={setCurrent} autoFocus/></Field>
      <Field><FieldLabel htmlFor="new-password">New password</FieldLabel><PasswordInput id="new-password" value={next} onChange={setNext} autoComplete="new-password" minLength={12} showStrength/></Field>
      <Field><FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel><PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={12}/>{confirm&&confirm!==next&&<FieldDescription className="text-destructive">Passwords don’t match yet.</FieldDescription>}</Field>
    </FormDialog>
  </div>;
}

function Sessions(){
  const {call}=useWorkspace();
  const sessions=useResource('/api/sessions');
  const [revoking,setRevoking]=useState(null),[all,setAll]=useState(false);
  const others=sessions.data?.sessions.filter(session=>!session.current).length||0;
  const columns=[
    {key:'device',header:'Device',cell:session=><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40"><Laptop className="size-4 text-muted-foreground"/></span><div className="grid gap-0.5"><span className="font-medium">{session.label||'Unknown device'}</span>{session.current?<Badge variant="secondary" className="w-fit text-[10px]">This device</Badge>:null}</div></div>},
    {key:'created',header:'Signed in',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell text-muted-foreground',cell:session=><TimeAgo value={session.created}/>},
    {key:'expires',header:'Expires',className:'text-muted-foreground',cell:session=><TimeAgo value={session.expires}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'text-right',cell:session=>!session.current&&<Button type="button" variant="outline" size="sm" onClick={()=>setRevoking(session)}><LogOut/>Sign out</Button>},
  ];
  return <Card>
    <CardHeader><CardTitle>Where you’re signed in</CardTitle><CardDescription>Sessions last 12 hours. Sign out any device you don’t recognise.</CardDescription>{others>0&&<CardAction><Button type="button" size="sm" variant="outline" onClick={()=>setAll(true)}>Sign out all others</Button></CardAction>}</CardHeader>
    <CardContent><DataTable columns={columns} rows={sessions.data?.sessions} loading={sessions.loading} error={sessions.error} onRetry={sessions.reload} skeletonRows={2} caption="Sessions" empty={null}/></CardContent>
    <ConfirmDialog open={Boolean(revoking)} onOpenChange={open=>{if(!open)setRevoking(null);}} title="Sign out this device?" description={`${revoking?.label||'This device'} will need to sign in again.`} confirmLabel="Sign out device" busyLabel="Signing out…"
      onConfirm={async()=>{await call('/api/sessions/revoke',{id:revoking.id});toast.success('Device signed out');await sessions.reload({quiet:true});}}/>
    <ConfirmDialog open={all} onOpenChange={setAll} title={`Sign out ${others} other device${others===1?'':'s'}?`} description="Every session except this one ends immediately." confirmLabel="Sign out others" busyLabel="Signing out…"
      onConfirm={async()=>{await call('/api/sessions',{});toast.success('Signed out of all other devices');await sessions.reload({quiet:true});}}/>
  </Card>;
}

function Appearance(){
  const {theme,setTheme}=useWorkspace();
  const options=[['system','System',Monitor,'Match your device’s setting.'],['light','Light',Sun,'Bright and high-contrast.'],['dark','Dark',Moon,'Easy on the eyes at night.']];
  return <Card>
    <CardHeader><CardTitle>Theme</CardTitle><CardDescription>Applies to the workspace on this browser. The public site always uses dark.</CardDescription></CardHeader>
    <CardContent><div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
      {options.map(([value,label,Icon,hint])=><button key={value} type="button" role="radio" aria-checked={theme===value} onClick={()=>{setTheme(value);toast.success(`${label} theme`);}} className={cn('grid gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/40',theme===value&&'border-brand ring-2 ring-brand/30')}>
        <span className={cn('flex h-20 items-end gap-1.5 rounded-lg border p-2',value==='light'?'bg-white':value==='dark'?'bg-neutral-900':'bg-gradient-to-r from-white from-50% to-neutral-900 to-50%')}>
          <span className={cn('h-full w-1/4 rounded',value==='light'?'bg-neutral-100':'bg-neutral-800')}/><span className="flex flex-1 flex-col gap-1.5"><span className={cn('h-2 w-2/3 rounded',value==='light'?'bg-neutral-200':'bg-neutral-700')}/><span className="h-2 w-1/3 rounded bg-indigo-400"/></span>
        </span>
        <span className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4"/>{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>)}
    </div></CardContent>
  </Card>;
}

function DataPrivacy(){
  const {me,call}=useWorkspace();
  const [exporting,setExporting]=useState(false),[deleting,setDeleting]=useState(false),[password,setPassword]=useState(''),[code,setCode]=useState(''),[confirm,setConfirm]=useState('');
  const download=async()=>{
    setExporting(true);
    try{const data=await call('/api/account/export');downloadText(`pluko-account-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(data.export,null,2),'application/json');toast.success('Your data was downloaded');}
    catch(failure){toast.error(failure.message);}
    finally{setExporting(false);}
  };
  return <div className="grid gap-6">
    <Card>
      <CardHeader><CardTitle>Download your data</CardTitle><CardDescription>A JSON file with your account, projects, keys (without secrets), jobs, results and feedback. Password hashes and key secrets are never included.</CardDescription></CardHeader>
      <CardFooter className="justify-end"><Button type="button" size="sm" variant="outline" disabled={exporting} onClick={download}>{exporting?<Spinner/>:<Download/>}{exporting?'Preparing…':'Download my data'}</Button></CardFooter>
    </Card>
    <Card className="border-destructive/40">
      <CardHeader><CardTitle className="text-destructive">Delete account</CardTitle><CardDescription>Permanently deletes your account, projects, API keys, jobs, results and feedback. This can’t be undone.</CardDescription></CardHeader>
      <CardFooter className="justify-end border-destructive/20 bg-destructive/5"><Button type="button" size="sm" variant="destructive" onClick={()=>{setPassword('');setCode('');setConfirm('');setDeleting(true);}}><Trash2/>Delete my account</Button></CardFooter>
    </Card>
    <FormDialog open={deleting} onOpenChange={setDeleting} destructive title="Delete your account?" description="Download your data first if you need it. Everything is removed immediately." submitLabel="Delete my account" busyLabel="Deleting…" submitDisabled={confirm!=='DELETE'}
      onSubmit={async()=>{await call('/api/account/delete',{password,confirm,...(me.mfa?{code}:{})});toast.success('Your account was deleted');window.location.assign('/');return false;}}>
      <Field><FieldLabel htmlFor="delete-password">Password</FieldLabel><PasswordInput id="delete-password" value={password} onChange={setPassword}/></Field>
      {me.mfa&&<Field><FieldLabel htmlFor="delete-code">Authenticator code</FieldLabel><CodeInput id="delete-code" value={code} onChange={setCode}/></Field>}
      <Field><FieldLabel htmlFor="delete-confirm">Type <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">DELETE</span> to confirm</FieldLabel><Input id="delete-confirm" required autoComplete="off" value={confirm} onChange={event=>setConfirm(event.target.value)}/></Field>
    </FormDialog>
  </div>;
}

export function Account(){
  const {route,href,mfaRequired}=useWorkspace();
  const tab=mfaRequired?'security':route.tab;
  return <>
    <PageHeader title="Account settings" description="Manage your profile, sign-in security and data."/>
    <div className="grid items-start gap-6 md:grid-cols-[13rem_1fr]">
      <nav aria-label="Account sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 md:sticky md:top-20 md:flex-col">
        {TABS.map(([value,label,Icon])=>{
          const disabled=mfaRequired&&value!=='security';
          return <Link key={value} href={disabled?'#':href('account','',value)} aria-current={tab===value?'page':undefined} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}
            className={cn('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',tab===value&&'bg-muted font-medium text-foreground',disabled&&'pointer-events-none opacity-40')}><Icon className="size-4"/>{label}</Link>;
        })}
      </nav>
      <div className="min-w-0">
        {tab==='profile'&&<Profile/>}
        {tab==='security'&&<Security required={mfaRequired}/>}
        {tab==='sessions'&&<Sessions/>}
        {tab==='appearance'&&<Appearance/>}
        {tab==='data'&&<DataPrivacy/>}
      </div>
    </div>
  </>;
}
