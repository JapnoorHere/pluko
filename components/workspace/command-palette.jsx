'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,FolderPlus,Keyboard,KeyRound,LogOut,Monitor,Moon,Search,ShieldPlus,Sparkles,Sun,UserPlus} from 'lucide-react';
import {useWorkspace} from '@/components/workspace/context';
import {Kbd} from '@/components/workspace/ui';
import {cn} from '@/lib/utils';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';

// Ctrl/⌘+K: jump to any page or run a common action, filtered as you type.
export function CommandPalette({open,onOpenChange,groups,onShortcuts}){
  const {me,navigate,start,setTheme,signOut}=useWorkspace();
  const [query,setQuery]=useState(''),[active,setActive]=useState(0);
  const list=useRef(null);
  useEffect(()=>{if(open){setQuery('');setActive(0);}},[open]);

  const commands=useMemo(()=>{
    const pages=groups.flatMap(group=>group.items.map(([id,name,Icon])=>({id:`go-${id}`,group:'Go to',label:name,icon:Icon,run:()=>navigate(id)})));
    const actions=[
      {id:'new-search',group:'Actions',label:'New search',icon:Sparkles,hint:'N',run:()=>navigate('playground')},
      {id:'new-project',group:'Actions',label:'Create project',icon:FolderPlus,run:()=>start('projects','create')},
      {id:'new-key',group:'Actions',label:'Create API key',icon:KeyRound,run:()=>start('keys','create')},
      ...(me.role==='admin'?[
        {id:'invite',group:'Actions',label:'Invite a user',icon:UserPlus,run:()=>start('users','invite')},
        {id:'rule',group:'Actions',label:'Add source rule',icon:ShieldPlus,run:()=>start('provider','rule')},
      ]:[]),
    ];
    const preferences=[
      {id:'theme-light',group:'Preferences',label:'Theme: Light',icon:Sun,run:()=>setTheme('light')},
      {id:'theme-dark',group:'Preferences',label:'Theme: Dark',icon:Moon,run:()=>setTheme('dark')},
      {id:'theme-system',group:'Preferences',label:'Theme: System',icon:Monitor,run:()=>setTheme('system')},
      {id:'shortcuts',group:'Preferences',label:'Keyboard shortcuts',icon:Keyboard,hint:'?',run:onShortcuts},
      {id:'sign-out',group:'Preferences',label:'Sign out',icon:LogOut,run:signOut},
    ];
    return [...actions,...pages,...preferences];
  },[groups,me.role,navigate,start,setTheme,signOut,onShortcuts]);

  const results=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    const found=needle?commands.filter(command=>`${command.group} ${command.label}`.toLowerCase().includes(needle)):commands;
    // Pasting a job ID jumps straight to that job.
    if(/^job_[\w-]{4,}$/i.test(query.trim()))return [{id:'open-job',group:'Jump to',label:`Open job ${query.trim()}`,icon:Search,run:()=>navigate('jobs',query.trim())},...found];
    return found;
  },[commands,query,navigate]);
  useEffect(()=>{setActive(0);},[query]);
  useEffect(()=>{list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active]);

  const run=command=>{onOpenChange(false);setTimeout(()=>command.run(),0);};
  const onKeyDown=event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setActive(index=>Math.min(results.length-1,index+1));}
    else if(event.key==='ArrowUp'){event.preventDefault();setActive(index=>Math.max(0,index-1));}
    else if(event.key==='Enter'&&results[active]){event.preventDefault();run(results[active]);}
  };

  let lastGroup=null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="sr-only"><DialogTitle>Command menu</DialogTitle><DialogDescription>Search pages and actions</DialogDescription></DialogHeader>
      <div className="flex items-center gap-2 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground"/>
        <input autoFocus value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="Type a command, page, or paste a job ID…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results[active]?`command-${results[active].id}`:undefined} className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
        <Kbd>Esc</Kbd>
      </div>
      <div ref={list} id="command-results" role="listbox" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
        {!results.length&&<p className="py-10 text-center text-sm text-muted-foreground">No results for “{query}”.</p>}
        {results.map((command,index)=>{
          const heading=command.group!==lastGroup?command.group:null;lastGroup=command.group;
          const Icon=command.icon;
          return <div key={command.id}>
            {heading&&<div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{heading}</div>}
            <button type="button" id={`command-${command.id}`} role="option" aria-selected={index===active} data-index={index} onMouseMove={()=>setActive(index)} onClick={()=>run(command)} className={cn('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm',index===active&&'bg-accent text-accent-foreground')}>
              <Icon className="size-4 text-muted-foreground"/>
              <span className="flex-1">{command.label}</span>
              {command.hint?<Kbd>{command.hint}</Kbd>:index===active&&<ArrowRight className="size-3.5 text-muted-foreground"/>}
            </button>
          </div>;
        })}
      </div>
      <div className="flex items-center gap-4 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd>navigate</span>
        <span className="flex items-center gap-1"><Kbd>Enter</Kbd>open</span>
      </div>
    </DialogContent>
  </Dialog>;
}

const SHORTCUTS=[
  ['General',[['Ctrl K','Open the command menu'],['?','Show keyboard shortcuts'],['/','Search the current list'],['N','New search']]],
  ['Go to',[['G O','Overview'],['G S','Playground'],['G P','Projects'],['G K','API keys'],['G J','Search jobs'],['G L','Request logs'],['G F','Quality feedback'],['G D','API guide'],['G A','Account settings']]],
  ['Results',[['← →','Previous or next image in the preview'],['Esc','Close a dialog or preview']]],
];

export function ShortcutsDialog({open,onOpenChange}){
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle><DialogDescription>Move around Pluko without the mouse. On a Mac, use ⌘ instead of Ctrl.</DialogDescription></DialogHeader>
      <div className="grid gap-5">
        {SHORTCUTS.map(([group,items])=><div key={group} className="grid gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{group}</h3>
          <div className="grid gap-1">{items.map(([keys,label])=><div key={label} className="flex items-center justify-between gap-4 py-1 text-sm"><span>{label}</span><span className="flex gap-1">{keys.split(' ').map(key=><Kbd key={key}>{key}</Kbd>)}</span></div>)}</div>
        </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
