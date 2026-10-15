'use client';
import {useCallback,useEffect,useState} from 'react';
import {Copy,Pencil,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Field,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table';
import {copyText,format} from '@/lib/display';

function QuotaForm({project,call,toast,close,refresh}) {
  const [pages,setPages]=useState(String(project.daily_pages)),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/admin/quota',{project_id:project.id,daily_pages:Number(pages)});toast('Project quota updated');await refresh();close();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <form onSubmit={submit} className="space-y-4"><h2>Daily provider-page quota</h2><p>{project.name} · {project.owner}</p><Field><FieldLabel htmlFor="quota-pages">Pages per day</FieldLabel><Input id="quota-pages" required type="number" min="1" max="1000000" value={pages} onChange={event=>setPages(event.target.value)}/></Field><Button type="submit" disabled={busy}>{busy?'Saving…':'Save quota'}</Button></form>;
}

function RenameProject({project,call,toast,close,refresh}) {
  const [name,setName]=useState(project.name),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/projects/rename',{id:project.id,name});toast('Project renamed');await refresh();close();}catch(error){toast(error.message);}finally{setBusy(false)}};
  return <form onSubmit={submit} className="space-y-4"><h2>Rename project</h2><Field><FieldLabel htmlFor="rename-project">Project name</FieldLabel><Input id="rename-project" required maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></Field><Button type="submit" disabled={busy}>{busy?'Saving…':'Save name'}</Button></form>;
}

function DeleteProject({project,call,toast,close,refresh}) {
  const [confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);try{await call('/api/projects/delete',{id:project.id,confirm});toast('Project deleted');await refresh();close();}catch(error){toast(error.message);setBusy(false);}};
  return <form onSubmit={submit} className="space-y-4">
    <h2>Delete “{project.name}”?</h2>
    <p>Its API keys stop working immediately, and its search jobs, results, usage history and feedback are deleted. This cannot be undone.</p>
    <Field><FieldLabel htmlFor="delete-project">Type the project name to confirm</FieldLabel><Input id="delete-project" required autoComplete="off" value={confirm} onChange={event=>setConfirm(event.target.value)}/></Field>
    <Button type="submit" variant="destructive" disabled={busy||confirm!==project.name}>{busy?'Deleting…':'Delete project'}</Button>
  </form>;
}

export function Projects({call,me,toast,modal,extraActions}) {
  const [projects,setProjects]=useState([]),[name,setName]=useState(''),[loaded,setLoaded]=useState(false);
  const load=useCallback(()=>call('/api/projects').then(data=>{setProjects(data.projects);setLoaded(true);}),[call]);
  useEffect(()=>{load().catch(error=>toast(error.message));},[load,toast]);
  const create=async event=>{event.preventDefault();try{await call('/api/projects',{name});setName('');toast('Project created');await load();}catch(error){toast(error.message);}};
  const admin=me.role==='admin';
  const columns=['Name',...(admin?['Owner']:[]),'Project ID','Daily page limit','Created','Actions'];
  const close=()=>modal(null);
  return <>
    <Card>
      <CardHeader><CardTitle>Create a project</CardTitle><CardDescription>Use one project per application. Keys, usage and webhooks are kept per project.</CardDescription></CardHeader>
      <CardContent><form className="row" onSubmit={create}><Input aria-label="Project name" required maxLength={100} placeholder="My application" value={name} onChange={event=>setName(event.target.value)}/><Button type="submit">Create project</Button></form></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border"><Table>
          <TableHeader><TableRow>{columns.map(column=><TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loaded&&!projects.length&&<TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No projects yet. Create one above to get an API key.</TableCell></TableRow>}
            {projects.map(project=><TableRow key={project.id}>
              <TableCell className="font-medium">{project.name}</TableCell>
              {admin&&<TableCell>{project.owner}</TableCell>}
              <TableCell><button type="button" className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground" title="Copy project ID" onClick={async()=>toast(await copyText(project.id)?'Project ID copied':'Copy failed')}>{project.id}<Copy className="size-3"/></button></TableCell>
              <TableCell>{project.daily_pages.toLocaleString()} pages</TableCell>
              <TableCell>{format(project.created)}</TableCell>
              <TableCell><div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={()=>modal(<RenameProject project={project} call={call} toast={toast} close={close} refresh={load}/>)}><Pencil/>Rename</Button>
                {extraActions?.(project,load)}
                {admin&&<Button type="button" variant="outline" size="sm" onClick={()=>modal(<QuotaForm project={project} call={call} toast={toast} close={close} refresh={load}/>)}>Edit quota</Button>}
                <Button type="button" variant="outline" size="sm" onClick={()=>modal(<DeleteProject project={project} call={call} toast={toast} close={close} refresh={load}/>)}><Trash2/>Delete</Button>
              </div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table></div>
      </CardContent>
    </Card>
  </>;
}
