'use client';

import {Plus,LogOut,ChevronsUpDown,Settings2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbPage,BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Separator} from '@/components/ui/separator';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuLabel} from '@/components/ui/dropdown-menu';
import {Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar} from '@/components/ui/sidebar';

function NavGroup({label,items,view,setView}) {
  const {isMobile,setOpenMobile}=useSidebar();
  return <SidebarGroup><SidebarGroupLabel>{label}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{items.map(([id,name,Icon])=><SidebarMenuItem key={id}><SidebarMenuButton className="data-active:[&_svg]:text-primary" isActive={view===id} onClick={()=>{setView(id);if(isMobile)setOpenMobile(false)}} tooltip={name}><Icon/><span>{name}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>;
}

export function DashboardShell({me,view,setView,nav,adminNav,signOut,children}) {
  const title=[...nav,...adminNav].find(item=>item[0]===view)?.[1]||'Overview';
  return <SidebarProvider>
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" onClick={()=>setView('overview')}>
        <img src="/logo.svg" alt="" className="size-8"/>
        <div className="grid flex-1 text-left text-sm leading-tight"><span className="font-semibold">Pluko</span><span className="text-xs text-muted-foreground">Image search workspace</span></div>
      </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
      <SidebarContent><NavGroup label="Workspace" items={nav} view={view} setView={setView}/>{me.role==='admin'&&<NavGroup label="Administration" items={adminNav} view={view} setView={setView}/>}</SidebarContent>
      <SidebarFooter><SidebarMenu><SidebarMenuItem><DropdownMenu><DropdownMenuTrigger asChild><SidebarMenuButton size="lg">
        <Avatar><AvatarFallback>{me.email.slice(0,1).toUpperCase()}</AvatarFallback></Avatar><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{me.email}</span><span className="text-xs capitalize text-muted-foreground">{me.role} account</span></div><ChevronsUpDown className="ml-auto size-4"/>
      </SidebarMenuButton></DropdownMenuTrigger><DropdownMenuContent side="top" align="end" className="w-64"><DropdownMenuLabel>My account</DropdownMenuLabel><DropdownMenuItem onSelect={()=>setView('account')}><Settings2/>Account settings</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={signOut}><LogOut/>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset><header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6"><SidebarTrigger className="-ml-1"/><Separator orientation="vertical" className="mx-2 h-4"/><Breadcrumb><BreadcrumbList><BreadcrumbItem className="hidden md:block">Workspace</BreadcrumbItem><BreadcrumbSeparator className="hidden md:block"/><BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><Badge variant="outline" className="ml-auto">Local</Badge></header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{view==='playground'?'Find images, inspect results, and build your integration.':view==='overview'?'Your image search activity at a glance.':'Manage your workspace and image search activity.'}</p></div><Button onClick={()=>setView('playground')}><Plus/>New search</Button></div><div className="grid gap-6" key={view}>{children}</div></main>
    </SidebarInset>
  </SidebarProvider>;
}
