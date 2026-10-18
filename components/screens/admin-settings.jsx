'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CloudCog,Rocket,UserPlus} from 'lucide-react';
import {useResource,useWorkspace} from '@/components/workspace/context';
import {CardSkeleton,ConfirmDialog,ErrorState,PageHeader,StatusBadge,ToneBadge,toast,Callout,Card,CardAction,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/workspace/ui';
import {settingsPayload} from '@/lib/ui-helpers';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';

export function AdminSettings(){
  const {call,href}=useWorkspace();
  const settings=useResource('/api/admin/settings');
  const [enabling,setEnabling]=useState(false),[launchTarget,setLaunchTarget]=useState(null);
  const stored=settings.data?.settings;
  const signup=stored?.self_signup_enabled==='true',provider=stored?.provider_enabled==='true',prelaunch=stored?.prelaunch_enabled==='true';
  const setPrelaunch=async on=>{await call('/api/admin/settings',settingsPayload(stored,{prelaunch_enabled:on}));toast.success(on?'Coming-soon mode is on':'Pluko is open to everyone');await settings.reload({quiet:true});};
  const setSignup=async on=>{await call('/api/admin/settings',settingsPayload(stored,{self_signup_enabled:on}));toast.success(on?'Self-service signup turned on':'Self-service signup turned off');await settings.reload({quiet:true});};

  return <>
    <PageHeader title="Platform settings" description="Instance-wide switches that affect every account."/>
    {settings.error?<ErrorState error={settings.error} onRetry={settings.reload}/>:!stored?<><CardSkeleton lines={1}/><CardSkeleton lines={1}/></>:<div className="grid max-w-3xl gap-14">
      {/* Numbered sections, like account settings and the legal pages. */}
      <section aria-labelledby="settings-launch" className="grid gap-5"><h2 id="settings-launch" className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">01</span>Launch</h2>
<Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="size-4"/>Coming-soon mode</CardTitle>
          <CardDescription>Show visitors a coming-soon page with a waitlist instead of the site. While it’s on, only administrators can sign in and the public API answers every call with 503 PRELAUNCH.</CardDescription>
          <CardAction><Switch checked={prelaunch} aria-label="Coming-soon mode" onCheckedChange={setLaunchTarget}/></CardAction></CardHeader>
        <CardFooter className="justify-between gap-3">{prelaunch?<ToneBadge tone="warning">Coming soon · closed to customers</ToneBadge>:<StatusBadge status="enabled" label="Open to everyone"/>}<Button asChild variant="ghost" size="sm"><Link href={href('waitlist')}>View waitlist<ArrowRight/></Link></Button></CardFooter>
      </Card>
      </section>
      <section aria-labelledby="settings-signup" className="grid gap-5"><h2 id="settings-signup" className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">02</span>Sign-up</h2>
<Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-4"/>Self-service signup</CardTitle>
          <CardDescription>Let anyone create a customer workspace from the sign-up page. When off, people join only by invitation.</CardDescription>
          <CardAction><Switch checked={signup} aria-label="Self-service signup" onCheckedChange={on=>on?setEnabling(true):setSignup(false).catch(failure=>toast.error(failure.message))}/></CardAction></CardHeader>
        <CardFooter className="justify-between gap-3">{signup?<StatusBadge status="enabled" label="Open to everyone"/>:<ToneBadge tone="neutral">Invite only</ToneBadge>}<Button asChild variant="ghost" size="sm"><Link href={href('users')}>Manage users<ArrowRight/></Link></Button></CardFooter>
      </Card>
<Callout type="note" title="Email isn’t configured yet">Pluko can’t verify email addresses or send reset links on its own yet. Keep signup off for a public launch, and share invitation and reset links yourself.</Callout>
      </section>
      <section aria-labelledby="settings-provider" className="grid gap-5"><h2 id="settings-provider" className="flex items-baseline gap-3 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]"><span className="font-mono text-base font-normal text-muted-foreground">03</span>Image provider</h2>
<Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CloudCog className="size-4"/>Image provider</CardTitle><CardDescription>Pause or resume the image source and manage source rules.</CardDescription><CardAction>{provider?<StatusBadge status="active" label="Running"/>:<ToneBadge tone="warning">Paused</ToneBadge>}</CardAction></CardHeader>
        <CardFooter className="justify-end"><Button asChild variant="outline" size="sm"><Link href={href('provider')}>Provider & rules<ArrowRight/></Link></Button></CardFooter>
      </Card>
      </section>
    </div>}
    <ConfirmDialog open={launchTarget!==null} onOpenChange={open=>{if(!open)setLaunchTarget(null);}} destructive={launchTarget===true}
      title={launchTarget?'Turn on coming-soon mode?':'Open Pluko to everyone?'}
      description={launchTarget?'Visitors see the coming-soon page. Customers can’t use the workspace and every API key gets 503 PRELAUNCH until you turn this off. Administrators keep full access.':'The full site, customer workspace and public API come back immediately.'}
      confirmLabel={launchTarget?'Turn on coming-soon mode':'Open Pluko'} busyLabel="Saving…" onConfirm={()=>setPrelaunch(launchTarget)}/>
    <ConfirmDialog open={enabling} onOpenChange={setEnabling} destructive={false} title="Open signup to everyone?" description="Anyone who can reach this site can create an account and start using provider pages. Without verified email, that includes throwaway addresses." confirmLabel="Turn on signup" busyLabel="Saving…" onConfirm={()=>setSignup(true)}/>
  </>;
}
