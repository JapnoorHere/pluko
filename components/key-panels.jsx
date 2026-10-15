'use client';
import {useCallback,useEffect,useState} from 'react';
import {Pencil,RefreshCw} from 'lucide-react';
import {ConfirmAction,StatusBadge,Toggle} from '@/components/dashboard-primitives';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {copyText,daysLeft,expiryText,format} from '@/lib/display';

const parseScopes=value=>{try{return JSON.parse(value);}catch{return [];}};

function KeyReveal({secret,message,toast}) {
  const origin=typeof window==='undefined'?'':window.location.origin;
  const snippet=`curl ${origin}/v1/usage \\\n  -H "Authorization: Bearer ${secret}"`;
  const copy=async(label,value)=>toast(await copyText(value)?`${label} copied`:'Copy failed: select the text manually');
  return <div className="space-y-4">
    <h2>Copy this key now</h2>
    <p>{message||'This is the only time its complete value is shown. Keep it in your backend environment variables, never in browser or mobile code.'}</p>
    <pre>{secret}</pre>
    <Button type="button" onClick={()=>copy('API key',secret)}>Copy API key</Button>
    <div className="space-y-2"><p>Quick test from a terminal:</p><pre>{snippet}</pre><Button type="button" variant="outline" onClick={()=>copy('Command',snippet)}>Copy command</Button></div>
  </div>;
}

function RenameKey({item,call,toast,close,refresh}) {
  const [name,setName]=useState(item.name),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/keys/rename',{id:item.id,name});toast('Key renamed');await refresh();close();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <form onSubmit={submit} className="space-y-4"><h2>Rename API key</h2><Field><FieldLabel htmlFor="rename-key">Key name</FieldLabel><Input id="rename-key" required maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></Field><Button type="submit" disabled={busy}>{busy?'Saving…':'Save name'}</Button></form>;
}

export function Keys({call,toast,modal,setView}) {
  const [projects,setProjects]=useState([]),[keys,setKeys]=useState([]),[project,setProject]=useState(''),[name,setName]=useState('Production'),[days,setDays]=useState('90'),[search,setSearch]=useState(true),[read,setRead]=useState(true),[loaded,setLoaded]=useState(false);
  const load=useCallback(async()=>{
    const [p,k]=await Promise.all([call('/api/projects'),call('/api/keys')]);
    setProjects(p.projects);setKeys(k.keys);setProject(current=>current||p.projects[0]?.id||'');setLoaded(true);
  },[call]);
  useEffect(()=>{load().catch(error=>toast(error.message));},[load,toast]);

  const create=async event=>{
    event.preventDefault();
    const scopes=[search&&'search',read&&'read'].filter(Boolean);
    if(!scopes.length){toast('Choose at least one permission');return;}
    try{
      const data=await call('/api/keys',{project_id:project,name,days:Number(days),scopes});
      modal(<KeyReveal secret={data.secret} toast={toast}/>);
      await load();
    }catch(error){toast(error.message);}
  };
  const rotate=item=>modal(<ConfirmAction title="Rotate this API key?" description={`A new key with the same name, permissions and expiry is created, and “${item.name}” stops working immediately. Update your backend with the new key right after.`} action="Rotate key" onCancel={()=>modal(null)} onConfirm={async()=>{try{const data=await call('/api/keys/rotate',{id:item.id});await load();modal(<KeyReveal secret={data.secret} message="The previous key no longer works. Copy the new key now; it is shown only once." toast={toast}/>);}catch(error){toast(error.message);modal(null);}}}/>);
  const revoke=item=>modal(<ConfirmAction title="Revoke API key?" description={`“${item.name}” will stop working immediately. This action cannot be undone.`} action="Revoke key" onCancel={()=>modal(null)} onConfirm={async()=>{await call('/api/keys/revoke',{id:item.id});toast('Key revoked');await load();modal(null);}}/>);
  const rename=item=>modal(<RenameKey item={item} call={call} toast={toast} close={()=>modal(null)} refresh={load}/>);

  return <>
    <Card>
      <CardHeader><CardTitle>Generate an API key</CardTitle><CardDescription>Keys belong to one project. They are shown once, so copy yours straight into your backend’s environment variables.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {loaded&&!projects.length?<p className="text-sm text-muted-foreground">You need a project first. <Button type="button" variant="link" className="h-auto p-0" onClick={()=>setView('projects')}>Create a project</Button></p>
        :<form onSubmit={create} className="space-y-4">
          <div className="keyForm">
            <Field><FieldLabel htmlFor="key-project">Project</FieldLabel><Select value={project||undefined} onValueChange={setProject}><SelectTrigger id="key-project" className="w-full"><SelectValue placeholder="Select a project"/></SelectTrigger><SelectContent>{projects.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field><FieldLabel htmlFor="key-name">Key name</FieldLabel><Input id="key-name" required maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></Field>
            <Field><FieldLabel htmlFor="key-days">Expires in days (1–365)</FieldLabel><Input id="key-days" type="number" min="1" max="365" value={days} onChange={event=>setDays(event.target.value)}/></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Search" description="Create, cancel and retry search jobs." checked={search} onChange={setSearch}/>
            <Toggle label="Read" description="Check job status, read results and usage." checked={read} onChange={setRead}/>
          </div>
          <Button type="submit">Generate key</Button>
        </form>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Your API keys</CardTitle><CardDescription>Keys expire automatically. Rotate one before it expires to avoid an outage.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border"><Table>
          <TableHeader><TableRow>{['Name','Project','Prefix','Permissions','Last used','Expires','Actions'].map(column=><TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {!keys.length&&<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No API keys yet.</TableCell></TableRow>}
            {keys.map(item=>{
              const left=daysLeft(item.expires),soon=!item.revoked&&left!==null&&left>0&&left<=14,gone=!item.revoked&&left!==null&&left<=0;
              return <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell><TableCell>{item.project}</TableCell><TableCell><code>{item.prefix}</code></TableCell>
                <TableCell><div className="flex gap-1">{parseScopes(item.scopes).map(scope=><Badge key={scope} variant="secondary">{scope}</Badge>)}</div></TableCell>
                <TableCell>{item.last_used?format(item.last_used):'Never'}</TableCell>
                <TableCell>{item.revoked?<StatusBadge status="revoked"/>:<span className="flex items-center gap-2">{expiryText(item.expires)}{soon&&<Badge variant="destructive">Expiring soon</Badge>}{gone&&<Badge variant="destructive">Expired</Badge>}</span>}</TableCell>
                <TableCell>{!item.revoked&&<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={()=>rename(item)}><Pencil/>Rename</Button><Button type="button" variant="outline" size="sm" onClick={()=>rotate(item)}><RefreshCw/>Rotate</Button><Button type="button" variant="outline" size="sm" onClick={()=>revoke(item)}>Revoke</Button></div>}</TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table></div>
      </CardContent>
    </Card>
  </>;
}
