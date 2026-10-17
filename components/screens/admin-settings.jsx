'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CloudCog,UserPlus} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,ConfirmDialog,ErrorState,PageHeader,StatusBadge,ToneBadge,toast,Callout,Card,CardAction,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/workspace/ui';
import {settingsPayload} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';

export function AdminSettings(){
  const {call,href}=useWorkspace();
  const settings=useResource('/api/admin/settings');
  const [enabling,setEnabling]=useState(false);
  const stored=settings.data?.settings;
  const signup=stored?.self_signup_enabled==='true',provider=stored?.provider_enabled==='true';
  const setSignup=async on=>{await call('/api/admin/settings',settingsPayload(stored,{self_signup_enabled:on}));toast.success(on?'Self-service signup turned on':'Self-service signup turned off');await settings.reload({quiet:true});};

  return <>
    <PageHeader title="Platform settings" description="Instance-wide switches that affect every account."/>
    {settings.error?<ErrorState error={settings.error} onRetry={settings.reload}/>:!stored?<><CardSkeleton lines={1}/><CardSkeleton lines={1}/></>:<div className="grid max-w-3xl gap-14">
      {/* Numbered sections, like account settings and the legal pages. */}
      <section aria-labelledby="settings-signup" className="grid gap-5"><h2 id="settings-signup" className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">01</span>Sign-up</h2>
<Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-4"/>Self-service signup</CardTitle>
          <CardDescription>Let anyone create a customer workspace from the sign-up page. When off, people join only by invitation.</CardDescription>
          <CardAction><Switch checked={signup} aria-label="Self-service signup" onCheckedChange={on=>on?setEnabling(true):setSignup(false).catch(failure=>toast.error(failure.message))}/></CardAction></CardHeader>
        <CardFooter className="justify-between gap-3">{signup?<StatusBadge status="enabled" label="Open to everyone"/>:<ToneBadge tone="neutral">Invite only</ToneBadge>}<Button asChild variant="ghost" size="sm"><Link href={href('users')}>Manage users<ArrowRight/></Link></Button></CardFooter>
      </Card>
<Callout type="note" title="Email isn’t configured yet">Pluko can’t verify email addresses or send reset links on its own yet. Keep signup off for a public launch, and share invitation and reset links yourself.</Callout>
      </section>
      <section aria-labelledby="settings-provider" className="grid gap-5"><h2 id="settings-provider" className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">02</span>Image provider</h2>
<Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CloudCog className="size-4"/>Image provider</CardTitle><CardDescription>Pause or resume the image source and manage source rules.</CardDescription><CardAction>{provider?<StatusBadge status="active" label="Running"/>:<ToneBadge tone="warning">Paused</ToneBadge>}</CardAction></CardHeader>
        <CardFooter className="justify-end"><Button asChild variant="outline" size="sm"><Link href={href('provider')}>Provider & rules<ArrowRight/></Link></Button></CardFooter>
      </Card>
      </section>
    </div>}
    <ConfirmDialog open={enabling} onOpenChange={setEnabling} destructive={false} title="Open signup to everyone?" description="Anyone who can reach this site can create an account and start using provider pages. Without verified email, that includes throwaway addresses." confirmLabel="Turn on signup" busyLabel="Saving…" onConfirm={()=>setSignup(true)}/>
  </>;
}
