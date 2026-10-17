'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Lock,ShieldCheck} from 'lucide-react';
import site from '@/components/design/design.module.css';
import {InlineError,PasswordInput,toast} from '@/components/workspace/ui';
import {Button} from '@/components/ui/button';
import {Field,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Spinner} from '@/components/ui/spinner';


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
  return <div className="relative isolate flex min-h-svh flex-col overflow-x-clip">
    <div className={site.glow} style={{inset:'-10% 0 45%',opacity:0.45}} aria-hidden/>
    <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-5 sm:px-8">
      <a href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><img src="/logo.svg" width="26" height="26" alt=""/>Pluko</a>
      <nav aria-label="Pluko" className="ml-auto flex items-center gap-1 text-sm">
        <a href="/docs" className="hidden rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:block">Docs</a>
        <a href="/status" className="hidden rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:block">Status</a>
        {!adminOnly&&['login','register'].includes(mode)&&<Button type="button" variant="outline" className="ml-1 rounded-full" onClick={()=>switchMode(mode==='register'?'login':'register')}>{mode==='register'?'Sign in':'Create account'}</Button>}
      </nav>
    </header>

    <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 py-14 sm:py-20">
      <div className="w-full max-w-[26rem]">
        <div className="text-center">
          {(adminOnly||mode==='mfa')&&<span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border bg-card shadow-sm"><ShieldCheck className="size-5 text-brand"/></span>}
          <p className="text-sm font-medium text-brand">{mode==='mfa'?'Two-step verification':adminOnly?'Administration':mode==='accept'?'Invitation':'Pluko workspace'}</p>
          <h1 className="mt-3 text-[clamp(2.25rem,6vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">{title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground text-pretty">{subtitle}</p>
        </div>
        <div className="mt-10 rounded-3xl border bg-card p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] sm:p-8">
          <form onSubmit={submit} className="grid gap-4" noValidate={false}>
            {mode==='mfa'?<Field>
              <FieldLabel htmlFor="auth-code">Authentication code</FieldLabel>
              <Input id="auth-code" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.5em]" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/>
              <FieldDescription>Signing in as <span className="font-medium text-foreground">{email}</span></FieldDescription>
            </Field>:<>
              {mode!=='accept'&&<Field><FieldLabel htmlFor="auth-email">Work email</FieldLabel><Input id="auth-email" required autoFocus type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={event=>setEmail(event.target.value)}/></Field>}
              <Field>
                <div className="flex items-center justify-between"><FieldLabel htmlFor="auth-password">{mode==='accept'?'New password':'Password'}</FieldLabel>
                  {mode==='login'&&<Popover><PopoverTrigger asChild><Button type="button" variant="link" size="sm" className="text-brand h-auto p-0 text-xs">Forgot password?</Button></PopoverTrigger><PopoverContent align="end" className="w-72 text-sm"><p className="font-medium">Reset your password</p><p className="mt-1 text-muted-foreground">Pluko doesn’t send reset emails yet. Ask your workspace administrator for a one-time reset link.</p></PopoverContent></Popover>}
                </div>
                <PasswordInput id="auth-password" value={password} onChange={setPassword} autoFocus={mode==='accept'} autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} showStrength={mode!=='login'}/>
              </Field>
              {mode==='accept'&&<Field><FieldLabel htmlFor="auth-confirm">Confirm password</FieldLabel><PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={12}/>{confirm&&confirm!==password&&<FieldDescription className="text-destructive">Passwords don’t match yet.</FieldDescription>}</Field>}
            </>}
            <InlineError error={error}/>
            <Button type="submit" size="lg" disabled={busy||(mode==='mfa'&&code.length!==6)} className="h-11 w-full rounded-full text-[15px]">{busy?<Spinner/>:null}{busy?'Please wait…':action}{!busy&&<ArrowRight/>}</Button>
            {mode==='mfa'&&<Button type="button" variant="ghost" className="w-full rounded-full" onClick={()=>switchMode('login')}><ArrowLeft/>Use a different account</Button>}
          </form>
        </div>
        <div className="mt-6 grid gap-3">
          {!adminOnly&&['login','register'].includes(mode)&&<p className="text-center text-sm text-muted-foreground">
            {mode==='register'?<>Already have an account? <Button type="button" variant="link" className="text-brand h-auto p-0" onClick={()=>switchMode('login')}>Sign in</Button></>
            :<>New to Pluko? <Button type="button" variant="link" className="text-brand h-auto p-0" onClick={()=>switchMode('register')}>Create an account</Button></>}
          </p>}
          {mode==='register'&&<p className="text-center text-xs text-muted-foreground">By creating an account you agree to the <a className="underline underline-offset-2 hover:text-foreground" href="/terms">Terms</a> and <a className="underline underline-offset-2 hover:text-foreground" href="/privacy">Privacy Policy</a>.</p>}
        </div>
      </div>
    </main>

    <footer className="flex flex-col items-center gap-3 px-5 pb-8 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5"><Lock className="size-3.5"/>Metadata only. Pluko never stores image files.</p>
      <p><a className="hover:text-foreground" href="/privacy">Privacy</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/terms">Terms</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/status">Status</a><span className="mx-2">·</span><a className="hover:text-foreground" href="/contact">Contact</a></p>
    </footer>
  </div>;
}
