'use client';
import {useCallback,useEffect,useState} from 'react';
import {Toggle,ConfirmAction} from '@/components/dashboard-primitives';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';
import {StatusBadge} from '@/components/customer-screens';
import {format,short} from '@/lib/display';

export function Users({call,toast,modal}){
  const [users,setUsers]=useState([]),[inviteEmail,setInviteEmail]=useState('');
  const load=useCallback(()=>call('/api/admin/users').then(data=>setUsers(data.users)),[call]);
  useEffect(()=>{load().catch(error=>toast(error.message));},[load,toast]);
  const invite=async event=>{event.preventDefault();try{const data=await call('/api/admin/invite',{email:inviteEmail});setInviteEmail('');modal(<><h2>Invitation created</h2><p>Share this one-time link securely. It expires in 24 hours.</p><pre>{data.link}</pre><Button type="button" onClick={()=>navigator.clipboard.writeText(data.link)}>Copy invitation link</Button></>);}catch(error){toast(error.message)}};
  const reset=async user=>{try{const data=await call('/api/admin/reset',{id:user.id});modal(<><h2>Password reset link</h2><p>Share this one-time link securely with {user.email}. It expires in 30 minutes.</p><pre>{data.link}</pre><Button type="button" onClick={()=>navigator.clipboard.writeText(data.link)}>Copy reset link</Button></>);}catch(error){toast(error.message)}};
  const changeStatus=user=>modal(<ConfirmAction title={`${user.active?'Suspend':'Activate'} account?`} description={`${user.email} will ${user.active?'lose access immediately':'be able to sign in again'}.`} action={user.active?'Suspend account':'Activate account'} onCancel={()=>modal(null)} onConfirm={async()=>{await call('/api/admin/user',{id:user.id,active:!user.active});toast('User updated');await load();modal(null)}}/>);
  return <><Card ><CardHeader><CardTitle>Invite a user</CardTitle></CardHeader><CardContent className="space-y-4"><form className="row" onSubmit={invite}><Input aria-label="Invitation email" required type="email" placeholder="person@company.com" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)}/><Button type="submit">Create invitation</Button></form></CardContent></Card><Card ><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="space-y-4"><div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{(['Email','Role','Status','MFA','Projects','Actions']).map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{!(users)?.length&&<TableRow><TableCell colSpan={(['Email','Role','Status','MFA','Projects','Actions']).length} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}{users.map(user=><TableRow key={user.id}><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell><TableCell><StatusBadge status={user.active?'active':'suspended'}/></TableCell><TableCell>{user.mfa?'Enabled':'Not enabled'}</TableCell><TableCell>{user.projects}</TableCell><TableCell><div className="row"><Button type="button" variant="outline" onClick={()=>reset(user)}>Reset link</Button><Button type="button" variant="outline" onClick={()=>changeStatus(user)}>{user.active?'Suspend':'Activate'}</Button></div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></>;
}
export function Provider({call,toast,modal}){
  const [settings,setSettings]=useState(),[rules,setRules]=useState([]),[attempts,setAttempts]=useState([]),[domain,setDomain]=useState(''),[action,setAction]=useState('block'),[reason,setReason]=useState('');
  const load=useCallback(async()=>{const [s,r,a]=await Promise.all([call('/api/admin/settings'),call('/api/admin/rules'),call('/api/admin/attempts')]);setSettings(s.settings);setRules(r.rules);setAttempts(a.attempts);},[call]);
  useEffect(()=>{load().catch(error=>toast(error.message));},[load,toast]);
  const save=async changes=>{try{await call('/api/admin/settings',{provider_enabled:changes.provider_enabled??settings.provider_enabled==='true',self_signup_enabled:changes.self_signup_enabled??settings.self_signup_enabled==='true',body_days:Number(settings.body_days),summary_days:Number(settings.summary_days),job_days:Number(settings.job_days),audit_days:Number(settings.audit_days)});toast('Provider settings saved');load();}catch(error){toast(error.message)}};
  const add=async event=>{event.preventDefault();try{await call('/api/admin/rules',{domain,action,reason});setDomain('');setReason('');toast('Source rule saved');load();}catch(error){toast(error.message)}};
  if(!settings)return <Skeleton className="h-48"/>;
  return <><Card ><CardHeader><CardTitle>Provider availability</CardTitle></CardHeader><CardContent className="space-y-4"><p>Pause new provider work without deleting jobs, users, or source rules.</p><Toggle label="Image provider" description="When paused, queued searches wait until it is enabled again." checked={settings.provider_enabled==='true'} onChange={provider_enabled=>save({provider_enabled})}/></CardContent></Card><Card ><CardHeader><CardTitle>Source rules</CardTitle></CardHeader><CardContent className="space-y-4"><p>Block sources completely or downrank them when a search has better alternatives.</p><form className="ruleForm" onSubmit={add}><Field><FieldLabel htmlFor={'admin-field-1'}>Domain</FieldLabel><Input id={'admin-field-1'} required placeholder="example.com" value={domain} onChange={event=>setDomain(event.target.value)}/></Field><Field><FieldLabel htmlFor={'admin-field-2'}>Action</FieldLabel><Select value={action||undefined} onValueChange={setAction}><SelectTrigger id={'admin-field-2'} className="w-full"><SelectValue placeholder="Select an option"/></SelectTrigger><SelectContent>{([{value:'block',label:'Block source'},{value:'downrank',label:'Downrank source'}]).map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel htmlFor={'admin-field-3'}>Reason</FieldLabel><Input id={'admin-field-3'} required placeholder="Frequently watermarked" value={reason} onChange={event=>setReason(event.target.value)}/></Field><Button type="submit">Add rule</Button></form><div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{(['Domain','Action','Reason','']).map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{!(rules)?.length&&<TableRow><TableCell colSpan={(['Domain','Action','Reason','']).length} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}{rules.map(rule=><TableRow key={rule.domain}><TableCell><code>{rule.domain}</code></TableCell><TableCell><StatusBadge status={rule.action}/></TableCell><TableCell>{rule.reason}</TableCell><TableCell><Button type="button" variant="outline" onClick={()=>modal(<ConfirmAction title="Remove source rule?" description={`${rule.domain} will be allowed back into future candidate results.`} action="Remove rule" onCancel={()=>modal(null)} onConfirm={async()=>{await call('/api/admin/rules',{domain:rule.domain,action:'remove',reason:'Removed by administrator'});toast('Source rule removed');await load();modal(null)}}/>)}>Remove</Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card><Card ><CardHeader><CardTitle>Recent provider attempts</CardTitle></CardHeader><CardContent className="space-y-4"><p>Inspect source response quality and failures without opening SQLite.</p><div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{(['When','Job','Page','Status','Candidates','Accepted','Duration','Error']).map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{!(attempts)?.length&&<TableRow><TableCell colSpan={(['When','Job','Page','Status','Candidates','Accepted','Duration','Error']).length} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}{attempts.map(item=><TableRow key={item.id}><TableCell>{format(item.created)}</TableCell><TableCell><code>{short(item.job_id)}</code></TableCell><TableCell>{item.page}</TableCell><TableCell><StatusBadge status={item.status}/></TableCell><TableCell>{item.candidates}</TableCell><TableCell>{item.accepted}</TableCell><TableCell>{item.duration} ms</TableCell><TableCell>{item.error||'—'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></>;
}
export function Audit({call,toast}){const [rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(true);const load=useCallback(async before=>{try{setLoading(true);const data=await call(`/api/admin/audit${before?`?before=${before}`:''}`);setRows(old=>before?old.concat(data.audit):data.audit);setCursor(data.next_cursor);}catch(error){toast(error.message);}finally{setLoading(false);}},[call,toast]);useEffect(()=>{load();},[load]);return <Card ><CardHeader><CardTitle>Audit history</CardTitle></CardHeader><CardContent className="space-y-4"><p>Every administrator action is retained with a timestamp and actor identifier.</p><div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow>{(['When','Event','Subject','Details']).map((column,index)=><TableHead key={index}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{!(rows)?.length&&<TableRow><TableCell colSpan={(['When','Event','Subject','Details']).length} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}{rows.map(item=><TableRow key={item.id}><TableCell>{format(item.created)}</TableCell><TableCell><code>{item.event}</code></TableCell><TableCell>{item.subject||'—'}</TableCell><TableCell className="auditDetails">{item.details||'—'}</TableCell></TableRow>)}</TableBody></Table></div>{cursor&&<Button type="button" variant="outline" disabled={loading} onClick={()=>load(cursor)}>{loading?'Loading…':'Load earlier activity'}</Button>}</CardContent></Card>}
const cleanupPolicies = {
  requests: settings => `Redacts request and response bodies older than ${settings.body_days} days, then removes request summaries older than ${settings.summary_days} days.`,
  attempts: settings => `Removes provider attempt logs older than ${settings.summary_days} days.`,
  jobs: settings => `Removes completed jobs older than ${settings.job_days} days, along with their tasks and result URLs. Queued and running jobs are kept.`,
  audit: settings => `Removes administrator audit records older than ${settings.audit_days} days.`,
  feedback: settings => `Removes feedback older than ${settings.summary_days} days.`,
  sessions: () => 'Removes expired login sessions only.',
  tokens: () => 'Removes expired invitation, reset, and setup tokens only.',
  rate_limits: () => 'Removes expired rate-limit counters only.',
  usage: () => 'Removes usage records older than 365 days.',
};
const dependentCleanupTables = new Set(['tasks','results']);

export function Storage({call,toast,modal}) {
  const [settings,setSettings]=useState(),[storage,setStorage]=useState();
  const load=useCallback(async()=>{
    const [s,d]=await Promise.all([call('/api/admin/settings'),call('/api/admin/storage')]);
    setSettings(s.settings);setStorage(d);
  },[call]);
  useEffect(()=>{load().catch(error=>toast(error.message));},[load,toast]);
  const save=async event=>{
    event.preventDefault();
    try {
      await call('/api/admin/settings',{provider_enabled:settings.provider_enabled==='true',self_signup_enabled:settings.self_signup_enabled==='true',body_days:Number(settings.body_days),summary_days:Number(settings.summary_days),job_days:Number(settings.job_days),audit_days:Number(settings.audit_days)});
      toast('Retention settings saved');await load();
    } catch(error) { toast(error.message); }
  };
  const cleanTable=table=>modal(<ConfirmAction
    title={`Clean ${table} records?`}
    description={cleanupPolicies[table](settings)}
    action="Clean this table"
    onCancel={()=>modal(null)}
    onConfirm={async()=>{
      try {
        await call('/api/admin/cleanup',{table});
        toast(`Cleanup finished for ${table}`);
        await load();modal(null);
      } catch(error) { toast(error.message); }
    }}
  />);
  const cleanAll=()=>modal(<ConfirmAction
    title="Apply all retention cleanup?"
    description="Apply every configured retention rule. This permanently removes eligible old records from all cleanup-managed tables. User accounts, projects, and API keys are kept."
    action="Apply all cleanup"
    onCancel={()=>modal(null)}
    onConfirm={async()=>{
      try { await call('/api/admin/cleanup',{});toast('Retention cleanup finished');await load();modal(null); }
      catch(error) { toast(error.message); }
    }}
  />);
  if(!settings||!storage)return <p className="loading">Loading storage controls…</p>;
  const storageMb=storage.files.reduce((sum,item)=>sum+item.bytes,0)/(1024*1024);
  return <>
    <Card><CardHeader><CardTitle>Retention policy</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>Pluko stores metadata and operational logs, never downloaded image files.</p>
      <form className="grid4" onSubmit={save}>
        { [['body_days','Full request bodies'],['summary_days','Request summaries'],['job_days','Jobs and result URLs'],['audit_days','Audit history']].map(([key,label])=><Field key={key}><FieldLabel htmlFor={`admin-field-4${key}`}>{label}<span className="fieldHint">Days</span></FieldLabel><Input id={`admin-field-4${key}`} type="number" min="1" max="3650" value={settings[key]} onChange={event=>setSettings(current=>({...current,[key]:event.target.value}))}/></Field>) }
      </form>
      <Button type="button" onClick={save}>Save retention policy</Button>
      <Toggle label="Self-service signup" description="Allows a new user to create a customer workspace. Enable only after adding verified email and abuse controls." checked={settings.self_signup_enabled==='true'} onChange={async enabled=>{
        setSettings(current=>({...current,self_signup_enabled:String(enabled)}));
        try { await call('/api/admin/settings',{provider_enabled:settings.provider_enabled==='true',self_signup_enabled:enabled,body_days:Number(settings.body_days),summary_days:Number(settings.summary_days),job_days:Number(settings.job_days),audit_days:Number(settings.audit_days)});toast('Signup setting saved'); }
        catch(error) { toast(error.message);await load(); }
      }}/>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Local storage</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="storageStats"><span><strong>{storage.tables.reduce((sum,item)=>sum+item.count,0)}</strong>records</span><span><strong>{storageMb.toFixed(2)} MB</strong>on disk</span><span><strong>{storage.backups.length}</strong>local backups</span></div>
      <div className="overflow-hidden rounded-md border"><Table>
        <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>Records</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>
          {!storage.tables.length&&<TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No records yet.</TableCell></TableRow>}
          {storage.tables.map(table=>{
            const description=cleanupPolicies[table.name];
            const dependent=dependentCleanupTables.has(table.name);
            return <TableRow key={table.name}>
              <TableCell><code>{table.name}</code></TableCell><TableCell>{table.count}</TableCell>
              <TableCell className="text-right">{description
                ? <Button type="button" variant="outline" size="sm" onClick={()=>cleanTable(table.name)}>Clean</Button>
                : <Button type="button" variant="ghost" size="sm" disabled title={dependent?'Removed automatically when an expired job is cleaned':'This table is excluded from retention cleanup'}>{dependent?'With jobs':'Kept'}</Button>}
              </TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table></div>
      <div className="adminActions">
        <Button type="button" variant="outline" onClick={async()=>{try{const data=await call('/api/admin/backup',{});toast(`Backup created: ${data.name}`);await load();}catch(error){toast(error.message)}}}>Create local backup</Button>
        <Button type="button" variant="outline" onClick={cleanAll}>Apply all cleanup</Button>
      </div>
    </CardContent></Card>
  </>;
}
