'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Gauge,ImageIcon,Lock,ShieldCheck,Webhook} from 'lucide-react';
import {InlineError,PasswordInput,toast} from '@/components/workspace/ui';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Spinner} from '@/components/ui/spinner';

const FEATURES=[
  [ImageIcon,'Source-aware results','Every image comes with its source page, domain and dimensions.'],
  [Gauge,'Async at any scale','Ask for 10 or 10,000 images. Jobs run in the background and page cleanly.'],
  [Webhook,'Built for backends','Scoped API keys, signed webhooks and an OpenAPI contract.'],
];

const COPY={
  login:['Welcome back','Sign in to your image search workspace.'],
  admin:['Administrator sign in','Operational controls for Pluko. Authenticator required.'],
  mfa:['Two-step verification','Enter the six-digit code from your authenticator app.'],
  register:['Create your account','Get a workspace, projects and API keys in under a minute.'],
  accept:['Set your password','Choose a password to accept your invitation or finish your reset.'],
};

export function AuthScreen({call,onAuthenticated,adminOnly=false}){
  const [mode,setMode]=useState('login'),[token,setToken]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(null);
  useEffect(()=>{
    const accept=new URLSearchParams(window.location.hash.slice(1)).get('accept');
    if(accept){setToken(accept);setMode('accept');}
    else if(!adminOnly&&new URLSearchParams(window.location.search).get('mode')==='register')setMode('register');
  },[adminOnly]);
  const switchMode=next=>{setMode(next);setError(null);setCode('');setConfirm('');};

  const login=async withCode=>{
    try{
      await call('/api/login',{email,password,...(withCode?{code}:{}),...(adminOnly?{portal:'admin'}:{})});
      toast.success('Signed in');
      await onAuthenticated();
    }catch(failure){
      // The server asks for a code only after the password checks out, so this is the second step.
      if(failure.code==='INVALID_MFA'&&!withCode){setMode('mfa');setError(null);return;}
      throw failure;
    }
  };
  const submit=async event=>{
    event.preventDefault();
    setBusy(true);setError(null);
    try{
      if(mode==='accept'){
        if(password!==confirm)throw new Error('The two passwords don’t match.');
        await call('/api/accept',{token,password});
        window.history.replaceState(null,'',window.location.pathname);
        setToken('');setPassword('');setConfirm('');switchMode('login');
        toast.success('Password saved. Sign in to continue.');
      }else if(mode==='register'){
        await call('/api/register',{email,password});
        toast.success('Account created. Welcome to Pluko.');
        await onAuthenticated();
      }else await login(mode==='mfa');
    }catch(failure){setError(failure);}
    finally{setBusy(false);}
  };

  const [title,subtitle]=COPY[mode==='login'&&adminOnly?'admin':mode];
  const action=mode==='accept'?'Save password':mode==='register'?'Create account':mode==='mfa'?'Verify and sign in':'Sign in';
  return <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
    <section className="relative hidden overflow-hidden border-r bg-muted/30 p-10 lg:flex lg:flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_-10%_-10%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_60%)]"/>
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"/>
      <a href="/" className="relative flex items-center gap-2 text-lg font-semibold"><img src="/logo.svg" alt="" className="size-8"/>Pluko</a>
      <div className="relative mt-auto mb-auto max-w-md space-y-8">
        <div className="space-y-3"><h1 className="text-4xl font-semibold tracking-tight text-balance">Good images, on demand.</h1><p className="text-muted-foreground">Image search infrastructure for products that need the right picture, with its source attached.</p></div>
        <ul className="grid gap-5">{FEATURES.map(([Icon,heading,text])=><li key={heading} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/60"><Icon className="size-4 text-brand"/></span><div><p className="text-sm font-medium">{heading}</p><p className="text-sm text-muted-foreground">{text}</p></div></li>)}</ul>
      </div>
      <p className="relative flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3.5"/>Metadata only. Pluko never stores image files.</p>
    </section>

    <section className="flex flex-col px-4 py-10 sm:px-8">
      <a href="/" className="mb-10 flex items-center gap-2 font-semibold lg:hidden"><img src="/logo.svg" alt="" className="size-7"/>Pluko</a>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div className="space-y-2">
          {(adminOnly||mode==='mfa')&&<span className="flex size-10 items-center justify-center rounded-xl border bg-muted/40"><ShieldCheck className="size-5 text-brand"/></span>}
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={submit} className="grid gap-4" noValidate={false}>
          {mode==='mfa'?<Field>
            <FieldLabel htmlFor="auth-code">Authentication code</FieldLabel>
            <Input id="auth-code" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.5em]" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/>
            <FieldDescription>Signing in as <span className="font-medium text-foreground">{email}</span></FieldDescription>
          </Field>:<>
            {mode!=='accept'&&<Field><FieldLabel htmlFor="auth-email">Work email</FieldLabel><Input id="auth-email" required autoFocus type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={event=>setEmail(event.target.value)}/></Field>}
            <Field>
              <div className="flex items-center justify-between"><FieldLabel htmlFor="auth-password">{mode==='accept'?'New password':'Password'}</FieldLabel>
                {mode==='login'&&<Popover><PopoverTrigger asChild><Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs">Forgot password?</Button></PopoverTrigger><PopoverContent align="end" className="w-72 text-sm"><p className="font-medium">Reset your password</p><p className="mt-1 text-muted-foreground">Pluko doesn’t send reset emails yet. Ask your workspace administrator for a one-time reset link.</p></PopoverContent></Popover>}
              </div>
              <PasswordInput id="auth-password" value={password} onChange={setPassword} autoFocus={mode==='accept'} autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} showStrength={mode!=='login'}/>
            </Field>
            {mode==='accept'&&<Field><FieldLabel htmlFor="auth-confirm">Confirm password</FieldLabel><PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={12}/>{confirm&&confirm!==password&&<FieldDescription className="text-destructive">Passwords don’t match yet.</FieldDescription>}</Field>}
          </>}
          <InlineError error={error}/>
          <Button type="submit" size="lg" disabled={busy||(mode==='mfa'&&code.length!==6)} className="w-full">{busy?<Spinner/>:null}{busy?'Please wait…':action}{!busy&&<ArrowRight/>}</Button>
          {mode==='mfa'&&<Button type="button" variant="ghost" className="w-full" onClick={()=>switchMode('login')}><ArrowLeft/>Use a different account</Button>}
        </form>

        {!adminOnly&&['login','register'].includes(mode)&&<p className="text-center text-sm text-muted-foreground">
          {mode==='register'?<>Already have an account? <Button type="button" variant="link" className="h-auto p-0" onClick={()=>switchMode('login')}>Sign in</Button></>
          :<>New to Pluko? <Button type="button" variant="link" className="h-auto p-0" onClick={()=>switchMode('register')}>Create an account</Button></>}
        </p>}
        {mode==='register'&&<p className="text-center text-xs text-muted-foreground">By creating an account you agree to the <a className="underline underline-offset-2 hover:text-foreground" href="/terms">Terms</a> and <a className="underline underline-offset-2 hover:text-foreground" href="/privacy">Privacy Policy</a>.</p>}
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground"><a className="hover:text-foreground" href="/privacy">Privacy</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/terms">Terms</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/status">Status</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/contact">Contact</a></p>
    </section>
  </main>;
}
