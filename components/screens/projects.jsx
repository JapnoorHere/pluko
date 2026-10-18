'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Copy,ExternalLink,FolderKanban,Gauge,LayoutGrid,List,Pencil,Plus,Search,Trash2,Webhook} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {FilterBar,ListEmpty,Pagination,useListQuery} from '@/components/workspace/list';
import {cn} from '@/lib/utils';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ConfirmDialog,DataTable,ErrorState,FormDialog,IdPill,PageHeader,RowActions,Shimmer,StatusBadge,TimeAgo,UsageMeter,copyWithToast,toast} from '@/components/workspace/ui';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';

const VIEW_KEY='pluko-projects-view';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';

export function CreateProjectDialog({open,onOpenChange,onCreated}){
  const {call}=useWorkspace();
  const [name,setName]=useState('');
  useEffect(()=>{if(open)setName('');},[open]);
  return <FormDialog open={open} onOpenChange={onOpenChange} title="Create a project" description="Use one project per application. Keys, usage limits and webhooks are kept per project." submitLabel="Create project" busyLabel="Creating…"
    onSubmit={async()=>{const data=await call('/api/projects',{name});toast.success(`“${name}” created`);await onCreated?.(data.id);}}>
    <Field><FieldLabel htmlFor="project-name">Project name</FieldLabel><Input id="project-name" required autoFocus maxLength={100} placeholder="Marketing site" value={name} onChange={event=>setName(event.target.value)}/><FieldDescription>You can rename it later.</FieldDescription></Field>
  </FormDialog>;
}

export function RenameProjectDialog({project,onOpenChange,onDone}){
  const {call}=useWorkspace();
  const [name,setName]=useState('');
  useEffect(()=>{if(project)setName(project.name);},[project]);
  return <FormDialog open={Boolean(project)} onOpenChange={onOpenChange} title="Rename project" submitLabel="Save name"
    onSubmit={async()=>{await call('/api/projects/rename',{id:project.id,name});toast.success('Project renamed');await onDone?.();}}>
    <Field><FieldLabel htmlFor="rename-project">Project name</FieldLabel><Input id="rename-project" required autoFocus maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></Field>
  </FormDialog>;
}

export function QuotaDialog({project,onOpenChange,onDone}){
  const {call}=useWorkspace();
  const [pages,setPages]=useState('');
  useEffect(()=>{if(project)setPages(String(project.daily_pages));},[project]);
  return <FormDialog open={Boolean(project)} onOpenChange={onOpenChange} title="Daily page limit" description={project?`${project.name} · ${project.owner}`:''} submitLabel="Save limit"
    onSubmit={async()=>{await call('/api/admin/quota',{project_id:project.id,daily_pages:Number(pages)});toast.success('Daily limit updated');await onDone?.();}}>
    <Field><FieldLabel htmlFor="quota-pages">Provider pages per day</FieldLabel><Input id="quota-pages" required type="number" min="1" max="1000000" autoFocus value={pages} onChange={event=>setPages(event.target.value)}/><FieldDescription>Each page returns up to 35 images. Usage resets at 00:00 UTC.</FieldDescription></Field>
  </FormDialog>;
}

export function DeleteProjectDialog({project,onOpenChange,onDone}){
  const {call}=useWorkspace();
  return <ConfirmDialog open={Boolean(project)} onOpenChange={onOpenChange} title={`Delete “${project?.name}”?`} confirmText={project?.name} confirmLabel="Delete project" busyLabel="Deleting…"
    description="Its API keys stop working immediately, and its search jobs, results, usage history and feedback are deleted. This can’t be undone."
    onConfirm={async()=>{await call('/api/projects/delete',{id:project.id,confirm:project.name});toast.success('Project deleted');await onDone?.();}}/>;
}

const USAGE_OPTIONS=[['under','Under 80% of today’s limit'],['near','Near the limit (80–99%)'],['at','At the limit']];
const SORT_OPTIONS=[['created_desc','Newest first'],['created_asc','Oldest first'],['name_asc','Name A–Z'],['name_desc','Name Z–A'],['usage_desc','Most used today'],['usage_asc','Least used today']];
const DEFAULTS={sort:'created_desc'};
const FILTERS=[
  {id:'usage',label:'Usage today',type:'multi',options:USAGE_OPTIONS},
  {id:'webhook',label:'Webhook',type:'select',anyLabel:'Any',options:[['yes','Webhook on'],['no','Webhook off']]},
  {id:'created',label:'Created',type:'date'},
];

export function Projects(){
  const {me,navigate,href,takeIntent}=useWorkspace();
  const admin=me.role==='admin';
  const list=useListQuery('/api/projects',{id:'projects',itemsKey:'projects',filters:FILTERS,defaults:DEFAULTS});
  const [creating,setCreating]=useState(false),[renaming,setRenaming]=useState(null),[quota,setQuota]=useState(null),[deleting,setDeleting]=useState(null),[view,setViewState]=useState('grid');
  // Grid or table, remembered in this browser.
  useEffect(()=>{try{const saved=localStorage.getItem(VIEW_KEY);if(saved==='grid'||saved==='table')setViewState(saved);}catch{}},[]);
  const setView=value=>{if(!value)return;setViewState(value);try{localStorage.setItem(VIEW_KEY,value);}catch{}};
  useEffect(()=>{if(takeIntent('projects','create'))setCreating(true);},[takeIntent]);
  const rows=list.items;
  const refresh=()=>list.reload({quiet:true});
  const meter=project=><UsageMeter used={project.pages_today} quota={project.daily_pages} label={`${project.name} usage today`}/>;

  const columns=[
    {key:'name',header:'Project',sortKey:'name',sortFirst:'asc',cell:project=><div className="grid min-w-0 gap-0.5"><Link href={href('projects',project.id)} onClick={event=>event.stopPropagation()} className="truncate font-medium hover:underline">{project.name}</Link><IdPill value={project.id}/></div>},
    ...(admin?[{key:'owner',header:'Owner',headClassName:'hidden lg:table-cell',className:'hidden lg:table-cell text-muted-foreground',cell:project=>project.owner}]:[]),
    {key:'usage',header:'Today',sortKey:'usage',headClassName:'hidden md:table-cell',className:'hidden md:table-cell',cell:project=><div className="w-44">{meter(project)}</div>},
    {key:'keys',header:'Keys',headClassName:'hidden lg:table-cell text-right',className:'hidden lg:table-cell text-right tabular-nums text-muted-foreground',cell:project=>project.active_keys},
    {key:'webhook',header:'Webhook',headClassName:'hidden sm:table-cell',className:'hidden sm:table-cell',cell:project=>project.webhook_url?<StatusBadge status="active" label="On"/>:<span className="text-sm text-muted-foreground">Off</span>},
    {key:'created',header:'Created',sortKey:'created',headClassName:'hidden xl:table-cell',className:'hidden xl:table-cell text-muted-foreground',cell:project=><TimeAgo value={project.created}/>},
    {key:'actions',header:<span className="sr-only">Actions</span>,className:'w-10 text-right',cell:project=><RowActions items={[
      {label:'Open project',icon:ExternalLink,onSelect:()=>navigate('projects',project.id)},
      {label:'Rename',icon:Pencil,onSelect:()=>setRenaming(project)},
      {label:'Webhook settings',icon:Webhook,onSelect:()=>navigate('projects',project.id,'webhook')},
      admin&&{label:'Edit daily limit',icon:Gauge,onSelect:()=>setQuota(project)},
      {label:'Copy project ID',icon:Copy,onSelect:()=>copyWithToast(project.id,'Project ID')},
      'separator',
      {label:'Delete project',icon:Trash2,destructive:true,onSelect:()=>setDeleting(project)},
    ]}/>},
  ];

  const empty=<ListEmpty list={list} icon={FolderKanban} title="Create your first project" description="Projects keep API keys, usage and webhooks separate for each app you build." action={<Button className="rounded-full px-4" onClick={()=>setCreating(true)}><Plus/>New project</Button>}/>;
  const actionsCell=columns.find(column=>column.key==='actions').cell;
  // The grid has no column headers, so it gets a sort menu; the table sorts from its headers.
  const toolbar=<FilterBar list={list} placeholder={admin?'Search projects, IDs or owners…':'Search projects…'} end={<>
    {view==='grid'&&<Select value={list.sort} onValueChange={list.setSort}><SelectTrigger size="sm" className="w-44" aria-label="Sort projects"><SelectValue/></SelectTrigger><SelectContent>{SORT_OPTIONS.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>}
    <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={setView} aria-label="Layout"><ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid/></ToggleGroupItem><ToggleGroupItem value="table" aria-label="Table view"><List/></ToggleGroupItem></ToggleGroup>
  </>}/>;
  const footer=<Pagination list={list} label="projects"/>;

  return <>
    <PageHeader title="Projects" description={admin?'Every project on this instance, with its owner and daily usage.':'One project per application. Each has its own API keys, limits and webhook.'}
      actions={<Button type="button" onClick={()=>setCreating(true)}><Plus/>New project</Button>}/>
    {view==='table'
      ?<DataTable columns={columns} rows={rows} loading={list.loading} error={list.error} onRetry={()=>list.reload()} caption="Projects" onRowClick={project=>navigate('projects',project.id)} toolbar={toolbar} empty={empty} footer={footer} sort={list.sort} onSort={list.setSort}/>
      :<div className="grid gap-3">
        {toolbar}
        {list.error&&!rows?.length?<ErrorState error={list.error} onRetry={()=>list.reload()} title="Couldn’t load your projects"/>
        :!rows?<ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]" aria-busy="true">{[1,2,3].map(index=><li key={index} className="grid gap-4 rounded-2xl border bg-card p-5"><div className="flex gap-3"><Shimmer className="size-10 rounded-xl"/><div className="grid flex-1 gap-2"><Shimmer className="h-4 w-2/3"/><Shimmer className="h-3 w-1/2"/></div></div><Shimmer className="h-2 w-full"/><Shimmer className="h-3 w-1/3"/></li>)}</ul>
        :!rows.length?empty
        :<ul className={cn('grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]',list.loading&&'opacity-60 transition-opacity')}>
          {rows.map(project=><li key={project.id}>
            <div role="link" tabIndex={0} aria-label={`Open ${project.name}`} onClick={()=>navigate('projects',project.id)} onKeyDown={event=>{if(event.key==='Enter'&&event.target===event.currentTarget)navigate('projects',project.id);}}
              className="group flex h-full cursor-pointer flex-col rounded-2xl border bg-card p-5 transition-all outline-none hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-semibold text-brand">{project.name.slice(0,1).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold tracking-[-0.01em]">{project.name}</p><IdPill value={project.id}/></div>
                <div onClick={event=>event.stopPropagation()}>{actionsCell(project)}</div>
              </div>
              {admin&&<p className="mt-3 truncate text-xs text-muted-foreground">Owner · {project.owner}</p>}
              <div className="mt-5 flex-1">{meter(project)}</div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                {project.webhook_url?<StatusBadge status="active" label="Webhook on"/>:<span>Webhook off</span>}
                <span>{project.active_keys} {project.active_keys===1?'key':'keys'} · Created <TimeAgo value={project.created}/></span>
              </div>
            </div>
          </li>)}
        </ul>}
        {rows?.length>0&&footer}
      </div>}
    <CreateProjectDialog open={creating} onOpenChange={setCreating} onCreated={async id=>{await refresh();navigate('projects',id);}}/>
    <RenameProjectDialog project={renaming} onOpenChange={open=>{if(!open)setRenaming(null);}} onDone={refresh}/>
    <QuotaDialog project={quota} onOpenChange={open=>{if(!open)setQuota(null);}} onDone={refresh}/>
    <DeleteProjectDialog project={deleting} onOpenChange={open=>{if(!open)setDeleting(null);}} onDone={refresh}/>
  </>;
}
