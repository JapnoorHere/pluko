'use client';
import {useCallback,useEffect,useState} from 'react';
import {toast as notify} from 'sonner';
import {DashboardShell} from '@/components/dashboard-shell';
import {Modal} from '@/components/dashboard-primitives';
import {Skeleton} from '@/components/ui/skeleton';
import {Auth,Overview,Playground,Jobs,Projects,Keys,Logs,Feedback,Docs,Account} from '@/components/customer-screens';
import {Users,Provider,Audit,Storage} from '@/components/admin-screens';
import {Activity,BookOpen,Boxes,CheckCircle2,ClipboardList,CloudCog,FolderKanban,KeyRound,LayoutDashboard,Search,Settings2,Sparkles,UsersRound} from 'lucide-react';

const nav=[['overview','Overview',LayoutDashboard],['playground','Playground',Sparkles],['jobs','Search jobs',Search],['projects','Projects',FolderKanban],['keys','API keys',KeyRound],['logs','Request logs',ClipboardList],['feedback','Quality feedback',CheckCircle2],['docs','API guide',BookOpen],['account','Account',Settings2]];
const adminNav=[['users','Users & invites',UsersRound],['provider','Provider & rules',CloudCog],['audit','Audit history',Activity],['storage','Storage & retention',Boxes]];

export default function Home(){
  const [me,setMe]=useState(null),[csrf,setCsrf]=useState(''),[view,setView]=useState('overview'),[modal,setModal]=useState(null),[sessionReady,setSessionReady]=useState(false);
  const call=useCallback(async(path,body,options={})=>{const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(options.apiKey?{Authorization:`Bearer ${options.apiKey}`}:{'X-CSRF-Token':csrf})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||'Request failed');return d;},[csrf]);
  const refresh=useCallback(async()=>{try{const d=await call('/api/me');setMe(d.user);setCsrf(d.csrf);}catch{setMe(null);setCsrf('');}finally{setSessionReady(true);}},[call]);
  useEffect(()=>{refresh();},[refresh]);
  const toast=useCallback(message=>notify(message),[]);
  if(!sessionReady)return <main className="sessionLoading"><Skeleton className="h-8 w-28"/><Skeleton className="h-28 w-full"/><Skeleton className="h-28 w-full"/></main>;
  if(!me)return <Auth call={call} onAuthenticated={refresh} toast={toast}/>;
  return <><DashboardShell me={me} view={view} setView={setView} nav={nav} adminNav={adminNav} signOut={async()=>{await call('/api/logout',{});setMe(null)}}><Screen view={view} call={call} me={me} toast={toast} modal={setModal} setView={setView}/></DashboardShell>{modal&&<Modal close={()=>setModal(null)}>{modal}</Modal>}</>;
}

function Screen({view,call,me,toast,modal,setView}){if(me.role==='admin'&&!me.mfa&&view!=='account')return <Account call={call} me={me} toast={toast} modal={modal} required/>;const screens={overview:Overview,playground:Playground,jobs:Jobs,projects:Projects,keys:Keys,logs:Logs,feedback:Feedback,docs:Docs,account:Account,users:Users,provider:Provider,audit:Audit,storage:Storage};const Component=screens[view]||Overview;return <Component call={call} me={me} toast={toast} modal={modal} setView={setView}/>;}
