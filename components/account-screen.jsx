'use client';
import {useCallback,useEffect,useState} from 'react';
import {Download,LogOut,ShieldCheck,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Alert,AlertTitle,AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {copyText,downloadText,format} from '@/lib/display';

function MfaSetup({call,details,toast,onEnabled}) {
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/mfa/enable',{code});toast('Authenticator enabled.');await onEnabled?.();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <div className="space-y-4">
    <h2>Add Pluko to your authenticator</h2>
    <p>Open an authenticator app (such as Google Authenticator, 1Password or Authy), choose “enter a setup key”, and type this key. Then enter the six-digit code the app shows.</p>
    <pre>{details.secret}</pre>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={async()=>toast(await copyText(details.secret)?'Setup key copied':'Copy failed')}>Copy setup key</Button>{details.uri&&<Button type="button" variant="outline" onClick={async()=>toast(await copyText(details.uri)?'Setup link copied':'Copy failed')}>Copy otpauth link</Button>}</div>
    <form onSubmit={submit}><Field><FieldLabel htmlFor="mfa-code">Six-digit code</FieldLabel><Input id="mfa-code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" value={code} onChange={event=>setCode(event.target.value)}/></Field><Button type="submit" disabled={busy}>{busy?'Checking…':'Enable authenticator'}</Button></form>
  </div>;
}

function MfaDisable({call,toast,close,onChanged}) {
  const [password,setPassword]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/mfa/disable',{password,code});toast('Authenticator turned off.');close();await onChanged?.();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <form onSubmit={submit} className="space-y-4">
    <h2>Turn off authenticator protection?</h2>
    <p>Anyone with your password will be able to sign in. Confirm with your password and a current code.</p>
    <Field><FieldLabel htmlFor="mfa-off-password">Password</FieldLabel><Input id="mfa-off-password" type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></Field>
    <Field><FieldLabel htmlFor="mfa-off-code">Authenticator code</FieldLabel><Input id="mfa-off-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value)}/></Field>
    <Button type="submit" variant="destructive" disabled={busy}>{busy?'Turning off…':'Turn off authenticator'}</Button>
  </form>;
}

function DeleteAccount({call,me,toast}) {
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{
    event.preventDefault();setBusy(true);
    try{await call('/api/account/delete',{password,confirm,...(me.mfa?{code}:{})});toast('Your account was deleted.');window.location.assign('/');}
    catch(error){toast(error.message);setBusy(false);}
  };
  return <form onSubmit={submit} className="space-y-4">
    <h2>Delete your account?</h2>
    <p>This permanently deletes your projects, API keys, jobs, results and feedback. It cannot be undone. Download your data first if you need it.</p>
    <Field><FieldLabel htmlFor="delete-password">Password</FieldLabel><Input id="delete-password" type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></Field>
    {me.mfa&&<Field><FieldLabel htmlFor="delete-code">Authenticator code</FieldLabel><Input id="delete-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value)}/></Field>}
    <Field><FieldLabel htmlFor="delete-confirm">Type DELETE to confirm</FieldLabel><Input id="delete-confirm" required autoComplete="off" value={confirm} onChange={event=>setConfirm(event.target.value)}/></Field>
    <Button type="submit" variant="destructive" disabled={busy||confirm!=='DELETE'}>{busy?'Deleting…':'Delete my account'}</Button>
  </form>;
}

function Sessions({call,toast}) {
  const [sessions,setSessions]=useState();
  const load=useCallback(()=>call('/api/sessions').then(data=>setSessions(data.sessions)).catch(error=>toast(error.message)),[call,toast]);
  useEffect(()=>{load();},[load]);
  const revoke=async id=>{try{await call('/api/sessions/revoke',{id});toast('Device signed out');await load();}catch(error){toast(error.message);}};
  const revokeOthers=async()=>{try{await call('/api/sessions',{});toast('Signed out of all other devices');await load();}catch(error){toast(error.message);}};
  const others=sessions?.filter(session=>!session.current).length||0;
  return <Card>
    <CardHeader><CardTitle>Where you’re signed in</CardTitle><CardDescription>Sessions last 12 hours. Sign out any device you don’t recognise.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {!sessions?<Skeleton className="h-24"/>:<div className="overflow-hidden rounded-md border"><Table>
        <TableHeader><TableRow>{['Device','Signed in','Expires',''].map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{sessions.map(session=><TableRow key={session.id}><TableCell>{session.label||'Unknown device'} {session.current&&<Badge variant="secondary">This device</Badge>}</TableCell><TableCell>{format(session.created)}</TableCell><TableCell>{format(session.expires)}</TableCell><TableCell className="text-right">{!session.current&&<Button type="button" variant="outline" size="sm" onClick={()=>revoke(session.id)}><LogOut/>Sign out</Button>}</TableCell></TableRow>)}</TableBody>
      </Table></div>}
      {others>0&&<Button type="button" variant="outline" onClick={revokeOthers}>Sign out all other devices</Button>}
    </CardContent>
  </Card>;
}

export function Account({call,me,toast,modal,required,onMfaEnabled}) {
  const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[exporting,setExporting]=useState(false);
  const setup=async()=>{try{const details=await call('/api/mfa/setup',{});modal(<MfaSetup call={call} details={details} toast={toast} onEnabled={async()=>{modal(null);await onMfaEnabled?.();}}/>);}catch(error){toast(error.message);}};
  const turnOff=()=>modal(<MfaDisable call={call} toast={toast} close={()=>modal(null)} onChanged={onMfaEnabled}/>);
  const download=async()=>{setExporting(true);try{const data=await call('/api/account/export');downloadText(`pluko-account-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(data.export,null,2),'application/json');toast('Your data was downloaded');}catch(error){toast(error.message);}finally{setExporting(false);}};
  const changePassword=async event=>{event.preventDefault();try{await call('/api/password',{current_password:current,password});toast('Password changed; other sessions were signed out.');setCurrent('');setPassword('');}catch(error){toast(error.message);}};
  return <>
    <Card>
      <CardHeader><CardTitle>Account security</CardTitle><CardDescription>{me.email}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {required&&<Alert><ShieldCheck/><AlertTitle>Set up your authenticator</AlertTitle><AlertDescription>Administrator accounts need authenticator protection before they can use operational controls.</AlertDescription></Alert>}
        {me.mfa
          ?<div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/><span>Authenticator protection is on.</span></div>{me.role!=='admin'?<Button type="button" variant="outline" onClick={turnOff}>Turn off</Button>:<span className="text-sm text-muted-foreground">Required for administrators.</span>}</div>
          :<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Add a second step at sign-in with an authenticator app. Recommended for every account.</p><Button type="button" onClick={setup}>Set up authenticator</Button></div>}
      </CardContent>
    </Card>
    <Sessions call={call} toast={toast}/>
    <Card><CardHeader><CardTitle>Change password</CardTitle><CardDescription>Use at least 12 characters. Other devices are signed out when you change it.</CardDescription></CardHeader><CardContent className="space-y-4">
      <form onSubmit={changePassword}>
        <Field><FieldLabel htmlFor="current-password">Current password</FieldLabel><Input id="current-password" type="password" required autoComplete="current-password" value={current} onChange={event=>setCurrent(event.target.value)}/></Field>
        <Field><FieldLabel htmlFor="new-password">New password</FieldLabel><Input id="new-password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></Field>
        <Button type="submit">Change password</Button>
      </form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Your data</CardTitle><CardDescription>Download what Pluko holds about your account, or delete it. API key secrets and password hashes are never included in the download.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" disabled={exporting} onClick={download}><Download/>{exporting?'Preparing…':'Download my data'}</Button>
      <Button type="button" variant="destructive" onClick={()=>modal(<DeleteAccount call={call} me={me} toast={toast}/>)}><Trash2/>Delete my account</Button>
    </CardContent></Card>
  </>;
}
