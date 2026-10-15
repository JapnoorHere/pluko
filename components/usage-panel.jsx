'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {format,usageShare} from '@/lib/display';

export function UsageBar({used,quota,label}) {
  const share=usageShare(used,quota);
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={quota} aria-valuenow={Math.min(used,quota)} className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div className={`h-full rounded-full transition-[width] ${share>=90?'bg-destructive':'bg-primary'}`} style={{width:`${share}%`}}/>
  </div>;
}

export function UsagePanel({call,setView}) {
  const [data,setData]=useState(),[error,setError]=useState('');
  useEffect(()=>{call('/api/usage').then(setData).catch(failure=>setError(failure.message));},[call]);
  if(error)return null;
  if(!data)return <Skeleton className="h-32"/>;
  const perPage=data.projects[0]?.images_per_page||35;
  return <Card>
    <CardHeader>
      <CardTitle>Today’s usage</CardTitle>
      <CardDescription>A “page” is one request to the image source and returns up to {perPage} images. Each project has a daily page limit, so searches can finish “partial” once it is used up. Usage resets at 00:00 UTC.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {!data.projects.length&&<p className="text-sm text-muted-foreground">Create a project to start tracking usage. <Button type="button" variant="link" className="h-auto p-0" onClick={()=>setView('projects')}>Create a project</Button></p>}
      {data.projects.map(item=><div key={item.project_id} className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{item.project}</span><span className="text-sm tabular-nums text-muted-foreground">{item.pages_used.toLocaleString()} of {item.pages_quota.toLocaleString()} pages used</span></div>
        <UsageBar used={item.pages_used} quota={item.pages_quota} label={`${item.project} daily page usage`}/>
        <p className="text-xs text-muted-foreground">Up to about {(item.pages_remaining*item.images_per_page).toLocaleString()} more images today · resets {format(item.resets_at)}</p>
      </div>)}
    </CardContent>
  </Card>;
}
