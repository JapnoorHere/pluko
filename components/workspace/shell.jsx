'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {
  Activity,BookOpen,Boxes,CheckCircle2,ChevronsUpDown,ClipboardList,CloudCog,ExternalLink,FileText,FolderKanban,Keyboard,KeyRound,
  LayoutDashboard,LogOut,MailPlus,Monitor,Moon,Search,Settings2,SlidersHorizontal,Sparkles,Sun,UsersRound,
} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CommandPalette,ShortcutsDialog} from '@/components/workspace/command-palette';
import {REFRESH_EVENT} from '@/components/workspace/refresh';
import {Kbd,UsageMeter} from '@/components/workspace/ui';
import {initials} from '@/lib/ui-helpers';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink,BreadcrumbList,BreadcrumbPage,BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Button} from '@/components/ui/button';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuSeparator,DropdownMenuSub,DropdownMenuSubContent,DropdownMenuSubTrigger,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Separator} from '@/components/ui/separator';
import {
  Sidebar,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupContent,SidebarGroupLabel,SidebarHeader,SidebarInset,SidebarMenu,
  SidebarMenuButton,SidebarMenuItem,SidebarProvider,SidebarTrigger,useSidebar,
} from '@/components/ui/sidebar';

export const NAV_GROUPS=[
  {label:null,items:[['overview','Overview',LayoutDashboard],['playground','Playground',Sparkles]]},
  {label:'Build',items:[['projects','Projects',FolderKanban],['keys','API keys',KeyRound]]},
  {label:'Monitor',items:[['jobs','Search jobs',Search],['logs','Request logs',ClipboardList],['feedback','Quality feedback',CheckCircle2]]},
  {label:'Resources',items:[['guide','API guide',BookOpen]],links:[['/docs','Documentation',FileText],['/status','System status',Activity]]},
];
export const ADMIN_GROUP={label:'Administration',items:[['users','Users & invites',UsersRound],['waitlist','Waitlist',MailPlus],['provider','Provider & rules',CloudCog],['audit','Audit history',Activity],['storage','Storage & retention',Boxes],['settings','Platform settings',SlidersHorizontal]]};

const THEME_ICONS={light:Sun,dark:Moon,system:Monitor};

function NavLink({id,name,Icon}){
  const {route,href}=useWorkspace();
  const {isMobile,setOpenMobile}=useSidebar();
  return <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={route.view===id} tooltip={name} className="relative data-[active=true]:font-medium data-[active=true]:[&_svg]:text-brand data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand">
      <Link href={href(id)} onClick={()=>{if(isMobile)setOpenMobile(false);}}><Icon/><span>{name}</span></Link>
    </SidebarMenuButton>
  </SidebarMenuItem>;
}

function UsageCard(){
  const {href,mfaRequired}=useWorkspace();
  const {me}=useWorkspace();
  const {data}=useResource('/api/usage',{poll:60000,enabled:!mfaRequired&&me.role!=='admin'});
  if(!data?.projects?.length)return null;
  const used=data.projects.reduce((sum,item)=>sum+item.pages_used,0),quota=data.projects.reduce((sum,item)=>sum+item.pages_quota,0);
  return <Link href={href('overview')} className="mx-2 mb-1 grid gap-2 rounded-2xl border bg-card p-3.5 text-xs shadow-sm transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
    <span className="flex items-center justify-between gap-2 font-medium"><span>Today’s usage</span><span className="font-normal whitespace-nowrap text-muted-foreground">UTC day</span></span>
    <UsageMeter used={used} quota={quota} label="Pages used today across all projects"/>
  </Link>;
}

function UserMenu({onShortcuts}){
  const {me,href,signOut,theme,setTheme}=useWorkspace();
  const ThemeIcon=THEME_ICONS[theme]||Monitor;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
        <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-brand/15 text-xs font-semibold text-brand">{initials(me.email)}</AvatarFallback></Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{me.email}</span><span className="truncate text-xs text-muted-foreground">{me.role==='admin'?'Administrator':'Customer'} account</span></div>
        <ChevronsUpDown className="ml-auto size-4"/>
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl">
      <DropdownMenuLabel className="grid font-normal"><span className="truncate text-sm font-medium">{me.email}</span><span className="text-xs text-muted-foreground">{me.mfa?'Authenticator on':'Authenticator off'}</span></DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <DropdownMenuItem asChild><Link href={href('account','','profile')}><Settings2/>Account settings</Link></DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger><ThemeIcon/>Theme</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            {['system','light','dark'].map(value=>{const Icon=THEME_ICONS[value];return <DropdownMenuRadioItem key={value} value={value}><Icon/>{value[0].toUpperCase()+value.slice(1)}</DropdownMenuRadioItem>;})}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onSelect={onShortcuts}><Keyboard/>Keyboard shortcuts<Kbd className="ml-auto">?</Kbd></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="/docs" target="_blank" rel="noopener noreferrer"><BookOpen/>Documentation<ExternalLink className="ml-auto"/></a></DropdownMenuItem>
      <DropdownMenuSeparator/>
      <DropdownMenuItem variant="destructive" onSelect={signOut}><LogOut/>Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

// Linear-style shortcuts: "g" then a letter jumps to a page; "n" starts a search; "/" focuses search; "?" shows help.
const GO_KEYS={o:'overview',s:'playground',p:'projects',k:'keys',j:'jobs',l:'logs',f:'feedback',d:'guide',a:'account'};
function useShortcuts({openPalette,openShortcuts}){
  const {navigate}=useWorkspace();
  const pending=useRef(0);
  useEffect(()=>{
    const onKey=event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openPalette();return;}
      const target=event.target;
      if(event.metaKey||event.ctrlKey||event.altKey||target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
      if(document.querySelector('[role="dialog"],[role="alertdialog"],[role="menu"]'))return;
      const key=event.key;
      if(Date.now()-pending.current<1200&&GO_KEYS[key.toLowerCase()]){pending.current=0;event.preventDefault();navigate(GO_KEYS[key.toLowerCase()]);return;}
      pending.current=0;
      if(key==='g'){pending.current=Date.now();return;}
      if(key==='n'){event.preventDefault();navigate('playground');return;}
      if(key==='r'){event.preventDefault();window.dispatchEvent(new Event(REFRESH_EVENT));return;}
      if(key==='?'){event.preventDefault();openShortcuts();return;}
      if(key==='/'){const input=document.querySelector('[data-search-input]');if(input){event.preventDefault();input.focus();}}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[navigate,openPalette,openShortcuts]);
}

function Crumbs({titles}){
  const {route,href,crumb}=useWorkspace();
  const title=titles[route.view]||'Overview';
  const sub=route.id?(crumb||(route.view==='jobs'?`Job ${route.id.slice(0,12)}…`:'Project')):route.view==='account'?route.tab[0].toUpperCase()+route.tab.slice(1):null;
  return <Breadcrumb className="min-w-0"><BreadcrumbList className="flex-nowrap">
    <BreadcrumbItem className="hidden md:inline-flex"><BreadcrumbLink asChild><Link href={href('overview')}>Workspace</Link></BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator className="hidden md:block"/>
    {sub?<><BreadcrumbItem><BreadcrumbLink asChild><Link href={href(route.view)}>{title}</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate">{sub}</BreadcrumbPage></BreadcrumbItem></>
    :<BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem>}
  </BreadcrumbList></Breadcrumb>;
}

export function WorkspaceShell({titles,children}){
  const {me,href,audience}=useWorkspace();
  const [palette,setPalette]=useState(false),[shortcuts,setShortcuts]=useState(false);
  const openPalette=()=>setPalette(true),openShortcuts=()=>setShortcuts(true);
  useShortcuts({openPalette,openShortcuts});
  const groups=me.role==='admin'?[...NAV_GROUPS,ADMIN_GROUP]:NAV_GROUPS;
  return <SidebarProvider>
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild><Link href={href('overview')}>
          <img src="/logo.png" alt="" className="size-8 shrink-0"/>
          <div className="grid flex-1 text-left text-sm leading-tight"><span className="flex items-center gap-1.5 font-semibold">Pluko<Badge variant="outline" className="h-4 px-1 text-[10px]">Beta</Badge></span><span className="truncate text-xs text-muted-foreground">{audience==='admin'?'Administration':'Image search workspace'}</span></div>
        </Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        <Button type="button" variant="outline" className="h-9 w-full justify-start gap-2 rounded-xl bg-card text-muted-foreground shadow-sm group-data-[collapsible=icon]:hidden" onClick={openPalette}><Search/>Search or jump to…<Kbd className="ml-auto">Ctrl K</Kbd></Button>
      </SidebarHeader>
      <SidebarContent>
        {groups.map(group=><SidebarGroup key={group.label||'main'}>
          {group.label&&<SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>
            {group.items.map(([id,name,Icon])=><NavLink key={id} id={id} name={name} Icon={Icon}/>)}
            {group.links?.map(([url,name,Icon])=><SidebarMenuItem key={url}><SidebarMenuButton asChild tooltip={name}><a href={url} target="_blank" rel="noopener noreferrer"><Icon/><span>{name}</span><ExternalLink className="ml-auto size-3 opacity-50"/></a></SidebarMenuButton></SidebarMenuItem>)}
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>)}
      </SidebarContent>
      <SidebarFooter>
        <UsageCard/>
        <SidebarMenu><SidebarMenuItem><UserMenu onShortcuts={openShortcuts}/></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background/75 px-3 backdrop-blur-xl backdrop-saturate-150 md:px-5">
        <SidebarTrigger className="-ml-1"/>
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4"/>
        <Crumbs titles={titles}/>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search" onClick={openPalette}><Search/></Button>
          <Button type="button" variant="ghost" size="sm" className="hidden text-muted-foreground md:inline-flex" onClick={openShortcuts}><Keyboard/>Shortcuts</Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-8 p-4 md:p-8 lg:px-10 lg:py-10">{children}</main>
    </SidebarInset>
    <CommandPalette open={palette} onOpenChange={setPalette} groups={groups} onShortcuts={openShortcuts}/>
    <ShortcutsDialog open={shortcuts} onOpenChange={setShortcuts}/>
  </SidebarProvider>;
}
