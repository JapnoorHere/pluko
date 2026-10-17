'use client';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import {toast} from 'sonner';
import {AlertCircle,ArrowLeft,Check,Copy,Eye,EyeOff,MoreHorizontal,RefreshCw} from 'lucide-react';
import {cn} from '@/lib/utils';
import {copyText,format} from '@/lib/display';
import {formatDuration,passwordStrength,percent,statusTone,timeAgo} from '@/lib/ui-helpers';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {AlertDialog,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardAction,CardDescription,CardFooter,CardHeader,CardTitle} from '@/components/ui/card';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Empty,EmptyContent,EmptyDescription,EmptyHeader,EmptyMedia,EmptyTitle} from '@/components/ui/empty';
import {Field,FieldContent,FieldDescription,FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {InputGroup,InputGroupAddon,InputGroupButton,InputGroupInput} from '@/components/ui/input-group';
import {Progress} from '@/components/ui/progress';
import {Skeleton} from '@/components/ui/skeleton';
import {Spinner} from '@/components/ui/spinner';
import {Switch} from '@/components/ui/switch';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Tooltip,TooltipContent,TooltipTrigger} from '@/components/ui/tooltip';

export {toast};

/* ---------- Page structure ---------- */

export function PageHeader({title,description,actions,back,eyebrow}){
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0 space-y-2">
      {back&&<Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5"/>{back.label}</Link>}
      {eyebrow&&<div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
      <h1 className="text-[clamp(1.875rem,3.4vw,2.625rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">{title}</h1>
      {description&&<p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
    </div>
    {actions&&<div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

export function SectionHeading({title,description,actions}){
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="space-y-0.5"><h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>{description&&<p className="text-sm text-muted-foreground">{description}</p>}</div>
    {actions&&<div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;
}

/* ---------- Status ---------- */

const TONE_CLASSES={
  success:'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning:'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  info:'border-brand/25 bg-brand/10 text-brand',
  danger:'border-destructive/25 bg-destructive/10 text-destructive',
  neutral:'border-border bg-muted/60 text-muted-foreground',
};
const DOT_CLASSES={success:'bg-emerald-500',warning:'bg-amber-500',info:'bg-brand',danger:'bg-destructive',neutral:'bg-muted-foreground/60'};

export function ToneBadge({tone='neutral',children,pulse=false,className}){
  return <Badge variant="outline" className={cn('gap-1.5 font-medium capitalize',TONE_CLASSES[tone],className)}>
    <span className={cn('size-1.5 rounded-full',DOT_CLASSES[tone],pulse&&'animate-pulse')} aria-hidden/>
    {children}
  </Badge>;
}

export function StatusBadge({status,label}){
  const tone=statusTone(status);
  return <ToneBadge tone={tone} pulse={['running','queued','pending'].includes(status)}>{label||String(status||'unknown').replaceAll('_',' ')}</ToneBadge>;
}

/* ---------- Loading: shimmer skeletons ---------- */

export function Shimmer({className,...props}){
  return <Skeleton className={cn('shimmer',className)} {...props}/>;
}

export function TableSkeleton({rows=5,columns=4}){
  return <div className="overflow-hidden rounded-2xl border" aria-busy="true" aria-label="Loading">
    <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">{Array.from({length:columns},(_,index)=><Shimmer key={index} className="h-3.5 flex-1"/>)}</div>
    {Array.from({length:rows},(_,row)=><div key={row} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
      {Array.from({length:columns},(_,column)=><Shimmer key={column} className={cn('h-4 flex-1',column===0&&'max-w-56',column===columns-1&&'max-w-20')}/>)}
    </div>)}
  </div>;
}

const GRID_COLUMNS={2:'sm:grid-cols-2',3:'sm:grid-cols-3',4:'sm:grid-cols-2 xl:grid-cols-4'};
export function StatGrid({columns=4,children,className}){
  return <div className={cn('grid gap-px overflow-hidden rounded-2xl border bg-border',GRID_COLUMNS[columns],className)}>{children}</div>;
}

export function StatGridSkeleton({count=4}){
  return <StatGrid columns={count}>{Array.from({length:count},(_,index)=><div key={index} className="grid gap-3 bg-card p-6"><Shimmer className="h-3.5 w-24"/><Shimmer className="h-9 w-20"/><Shimmer className="h-3 w-32"/></div>)}</StatGrid>;
}

export function CardSkeleton({lines=3,className}){
  return <Card className={className}><CardHeader className="space-y-3"><Shimmer className="h-5 w-40"/><Shimmer className="h-3.5 w-64 max-w-full"/></CardHeader><div className="space-y-3 px-(--card-spacing) pb-(--card-spacing)">{Array.from({length:lines},(_,index)=><Shimmer key={index} className="h-9 w-full"/>)}</div></Card>;
}

export function GallerySkeleton({count=6}){
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{Array.from({length:count},(_,index)=><div key={index} className="overflow-hidden rounded-xl border"><Shimmer className="aspect-video w-full rounded-none"/><div className="space-y-2 p-3"><Shimmer className="h-4 w-3/4"/><Shimmer className="h-3 w-1/2"/></div></div>)}</div>;
}

export function PageSkeleton(){
  return <div className="grid gap-6"><div className="space-y-2"><Shimmer className="h-7 w-48"/><Shimmer className="h-4 w-80 max-w-full"/></div><StatGridSkeleton/><TableSkeleton/></div>;
}

/* ---------- Empty and error states ---------- */

export function EmptyState({icon:Icon,title,description,action,className}){
  return <Empty className={cn('rounded-2xl border border-dashed bg-muted/20 py-16',className)}>
    <EmptyHeader>
      {Icon&&<EmptyMedia variant="icon" className="size-11 rounded-2xl bg-background shadow-sm ring-1 ring-border"><Icon className="size-5"/></EmptyMedia>}
      <EmptyTitle className="text-lg font-semibold tracking-[-0.02em]">{title}</EmptyTitle>
      {description&&<EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
    {action&&<EmptyContent>{action}</EmptyContent>}
  </Empty>;
}

export function ErrorState({error,onRetry,title='Something went wrong'}){
  return <Alert variant="destructive">
    <AlertCircle/>
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription className="flex flex-wrap items-center gap-3">
      <span>{error?.message||String(error||'The request failed.')}</span>
      {onRetry&&<Button type="button" size="sm" variant="outline" onClick={()=>onRetry()}><RefreshCw/>Try again</Button>}
    </AlertDescription>
  </Alert>;
}

export function InlineError({error}){
  if(!error)return null;
  return <Alert variant="destructive"><AlertCircle/><AlertDescription>{error.message||String(error)}</AlertDescription></Alert>;
}

/* ---------- Dialogs ---------- */

// A form in a dialog: title, description, fields, and a footer with Cancel and Submit.
// onSubmit errors are shown inside the dialog. Return false from onSubmit to keep it open.
export function FormDialog({open,onOpenChange,title,description,submitLabel='Save',busyLabel,destructive=false,onSubmit,submitDisabled=false,children,size='md',footer,hideFooter=false}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(null);
  useEffect(()=>{if(open){setError(null);setBusy(false);}},[open]);
  const submit=async event=>{
    event.preventDefault();
    setBusy(true);setError(null);
    try{
      const result=await onSubmit?.();
      if(result!==false)onOpenChange(false);
    }catch(failure){setError(failure);}
    finally{setBusy(false);}
  };
  return <Dialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next);}}>
    <DialogContent className={cn('max-h-[92vh] overflow-y-auto rounded-2xl',size==='lg'?'sm:max-w-2xl':size==='sm'?'sm:max-w-sm':'sm:max-w-lg')}>
      <form onSubmit={submit} className="grid gap-5">
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description&&<DialogDescription>{description}</DialogDescription>}</DialogHeader>
        <div className="grid gap-4">{children}</div>
        <InlineError error={error}/>
        {!hideFooter&&(footer||<DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant={destructive?'destructive':'default'} disabled={busy||submitDisabled}>{busy&&<Spinner/>}{busy?(busyLabel||'Saving…'):submitLabel}</Button>
        </DialogFooter>)}
      </form>
    </DialogContent>
  </Dialog>;
}

// A plain dialog with no form, for content such as a secret reveal or a preview.
export function InfoDialog({open,onOpenChange,title,description,children,size='md',footer,dismissible=true}){
  return <Dialog open={open} onOpenChange={next=>{if(dismissible||next)onOpenChange(next);}}>
    <DialogContent showCloseButton={dismissible} onInteractOutside={event=>{if(!dismissible)event.preventDefault();}} onEscapeKeyDown={event=>{if(!dismissible)event.preventDefault();}} className={cn('max-h-[92vh] overflow-y-auto rounded-2xl',size==='xl'?'sm:max-w-5xl':size==='lg'?'sm:max-w-2xl':'sm:max-w-lg')}>
      <DialogHeader><DialogTitle>{title}</DialogTitle>{description&&<DialogDescription>{description}</DialogDescription>}</DialogHeader>
      {children}
      {footer&&<DialogFooter>{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>;
}

// Confirmation for risky actions. `confirmText` makes the user type a value first.
export function ConfirmDialog({open,onOpenChange,title,description,confirmLabel='Confirm',busyLabel='Working…',destructive=true,onConfirm,confirmText,children}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(null),[typed,setTyped]=useState('');
  const inputId=useId();
  useEffect(()=>{if(open){setBusy(false);setError(null);setTyped('');}},[open]);
  const confirm=async event=>{
    event?.preventDefault();
    setBusy(true);setError(null);
    try{const result=await onConfirm?.();if(result!==false)onOpenChange(false);}
    catch(failure){setError(failure);}
    finally{setBusy(false);}
  };
  const blocked=confirmText!==undefined&&typed!==confirmText;
  return <AlertDialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next);}}>
    <AlertDialogContent className="rounded-2xl">
      <form onSubmit={confirm} className="grid gap-4">
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle>{description&&<AlertDialogDescription>{description}</AlertDialogDescription>}</AlertDialogHeader>
        {children}
        {confirmText!==undefined&&<Field><FieldLabel htmlFor={inputId}>Type <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{confirmText}</span> to confirm</FieldLabel><Input id={inputId} autoComplete="off" autoFocus value={typed} onChange={event=>setTyped(event.target.value)}/></Field>}
        <InlineError error={error}/>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant={destructive?'destructive':'default'} disabled={busy||blocked}>{busy&&<Spinner/>}{busy?busyLabel:confirmLabel}</Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}

/* ---------- Copy, code and secrets ---------- */

export async function copyWithToast(value,label='Value'){
  if(await copyText(value)){toast.success(`${label} copied`);return true;}
  toast.error('Copy failed. Select the text and copy it manually.');return false;
}

export function useCopy(){
  const [copied,setCopied]=useState(false);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),1600);return()=>clearTimeout(timer);},[copied]);
  const copy=async(value,label='Copied')=>{
    if(await copyText(value)){setCopied(true);toast.success(`${label} copied`);return true;}
    toast.error('Copy failed. Select the text and copy it manually.');return false;
  };
  return [copy,copied];
}

export function CopyButton({value,label='Value',children,variant='outline',size='sm',className,iconOnly=false}){
  const [copy,copied]=useCopy();
  const Icon=copied?Check:Copy;
  if(iconOnly)return <Tooltip><TooltipTrigger asChild><Button type="button" variant={variant} size={size==='sm'?'icon-sm':'icon'} className={className} aria-label={`Copy ${label.toLowerCase()}`} onClick={event=>{event.stopPropagation();copy(value,label);}}><Icon/></Button></TooltipTrigger><TooltipContent>{copied?'Copied':`Copy ${label.toLowerCase()}`}</TooltipContent></Tooltip>;
  return <Button type="button" variant={variant} size={size} className={className} onClick={event=>{event.stopPropagation();copy(value,label);}}><Icon/>{children||(copied?'Copied':`Copy ${label.toLowerCase()}`)}</Button>;
}

// A read-only value with a copy button, optionally masked until revealed.
export function CopyField({value,label,description,masked=false,id}){
  const autoId=useId(),fieldId=id||autoId;
  const [shown,setShown]=useState(!masked);
  const [copy,copied]=useCopy();
  return <Field>
    {label&&<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>}
    <InputGroup>
      <InputGroupInput id={fieldId} readOnly value={shown?value:'•'.repeat(Math.min(32,String(value).length))} className="font-mono text-xs" onFocus={event=>event.target.select()}/>
      <InputGroupAddon align="inline-end">
        {masked&&<InputGroupButton size="icon-xs" aria-label={shown?'Hide value':'Show value'} onClick={()=>setShown(value=>!value)}>{shown?<EyeOff/>:<Eye/>}</InputGroupButton>}
        <InputGroupButton size="icon-xs" aria-label={`Copy ${label||'value'}`} onClick={()=>copy(value,label||'Value')}>{copied?<Check/>:<Copy/>}</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
    {description&&<FieldDescription>{description}</FieldDescription>}
  </Field>;
}

export {CodeBlock,Callout,Reveal,LanguageProvider} from '@/components/design/system';

// Shows a one-time secret. The Done button stays disabled until the user confirms they saved it.
export function SecretReveal({secret,label='Secret',warning,children,onDone,doneLabel='Done'}){
  const [saved,setSaved]=useState(false);
  const id=useId();
  return <div className="grid gap-4">
    <Callout type="warning" title="Copy it now">{warning||'This is the only time the full value is shown. Store it somewhere safe.'}</Callout>
    <CopyField value={secret} label={label}/>
    {children}
    {onDone&&<div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm"><input id={id} type="checkbox" className="size-4 accent-[var(--brand)]" checked={saved} onChange={event=>setSaved(event.target.checked)}/>I’ve saved it somewhere safe</label>
      <Button type="button" disabled={!saved} onClick={onDone}>{doneLabel}</Button>
    </div>}
  </div>;
}

/* ---------- Data display ---------- */

// One tile inside a StatGrid: label, big number, a hint or footer.
export function StatCard({label,value,icon:Icon,hint,tone,footer}){
  return <div className="flex min-w-0 flex-col gap-2 bg-card p-6">
    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{label}</span>{Icon&&<Icon className="size-4 text-muted-foreground/70"/>}</div>
    <div className={cn('text-[2.25rem] leading-none font-semibold tracking-[-0.04em] tabular-nums',tone==='danger'&&'text-destructive')}>{value}</div>
    {(hint||footer)&&<div className="mt-auto pt-1 text-xs text-muted-foreground">{footer||hint}</div>}
  </div>;
}

export function TimeAgo({value,className}){
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  if(!value)return <span className={cn('text-muted-foreground',className)}>—</span>;
  return <Tooltip><TooltipTrigger asChild><time dateTime={new Date(value).toISOString()} className={cn('whitespace-nowrap',className)}>{timeAgo(value,now)}</time></TooltipTrigger><TooltipContent>{format(value)}</TooltipContent></Tooltip>;
}

export function Duration({ms}){
  const slow=Number(ms)>=1500;
  return <span className={cn('tabular-nums',slow&&'text-amber-600 dark:text-amber-400')}>{formatDuration(ms)}</span>;
}

// A shortened ID that copies the full value on click.
export function IdPill({value,length=14}){
  const [copy,copied]=useCopy();
  if(!value)return <span className="text-muted-foreground">—</span>;
  const text=value.length>length?`${value.slice(0,length)}…`:value;
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={event=>{event.stopPropagation();copy(value,'ID');}} className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{text}{copied?<Check className="size-3"/>:<Copy className="size-3 opacity-60"/>}</button></TooltipTrigger><TooltipContent className="font-mono">{value}</TooltipContent></Tooltip>;
}

export function DescriptionList({items,className}){
  return <dl className={cn('grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]',className)}>
    {items.filter(Boolean).map(([term,value])=><div key={term} className="contents"><dt className="text-muted-foreground">{term}</dt><dd className="min-w-0 break-words">{value??'—'}</dd></div>)}
  </dl>;
}

// Progress in the brand colour. The shadcn indicator uses --primary, which is the black button colour.
export function BrandProgress({className,...props}){
  return <Progress className={cn('[&>*]:bg-brand',className)} {...props}/>;
}

export function UsageMeter({used,quota,label,showText=true}){
  const share=percent(used,quota);
  return <div className="grid gap-1.5">
    {showText&&<div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground"><span className="tabular-nums">{Number(used||0).toLocaleString()} / {Number(quota||0).toLocaleString()} pages</span><span className={cn('tabular-nums',share>=90&&'text-destructive',share>=70&&share<90&&'text-amber-600 dark:text-amber-400')}>{share}%</span></div>}
    <Progress value={share} aria-label={label} className={share>=90?'[&>*]:bg-destructive':share>=70?'[&>*]:bg-amber-500':'[&>*]:bg-brand'}/>
  </div>;
}

// Small bar chart for short series such as seven days of usage. Accessible as a table.
export function MiniBars({data,valueLabel='value',height=96}){
  const max=Math.max(1,...data.map(item=>item.value));
  return <figure className="grid gap-2">
    <div className="flex items-end gap-1.5" style={{height}} aria-hidden>
      {data.map(item=><Tooltip key={item.label}><TooltipTrigger asChild><div className="group flex h-full flex-1 items-end"><div className={cn('w-full rounded-t-sm bg-brand/70 transition-colors group-hover:bg-brand',!item.value&&'bg-muted')} style={{height:`${Math.max(4,(item.value/max)*100)}%`}}/></div></TooltipTrigger><TooltipContent>{item.label}: {item.value.toLocaleString()} {valueLabel}</TooltipContent></Tooltip>)}
    </div>
    <div className="flex gap-1.5 text-[10px] text-muted-foreground" aria-hidden>{data.map(item=><span key={item.label} className="flex-1 truncate text-center">{item.short||item.label}</span>)}</div>
    <table className="sr-only"><caption>{valueLabel} per day</caption><tbody>{data.map(item=><tr key={item.label}><th>{item.label}</th><td>{item.value}</td></tr>)}</tbody></table>
  </figure>;
}

/* ---------- Tables ---------- */

// Row actions in a "⋯" menu. Items: {label, icon, onSelect, destructive, disabled} or 'separator'.
export function RowActions({items,label='Actions'}){
  const visible=items.filter(Boolean);
  if(!visible.length)return null;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={event=>event.stopPropagation()}><MoreHorizontal/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52" onClick={event=>event.stopPropagation()}>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
      {visible.map((item,index)=>item==='separator'
        ?<DropdownMenuSeparator key={`separator-${index}`}/>
        :<DropdownMenuItem key={item.label} variant={item.destructive?'destructive':'default'} disabled={item.disabled} onSelect={item.onSelect}>{item.icon&&<item.icon/>}{item.label}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

// A table with a shimmer while loading, an empty state, an error state, and optional row links.
// columns: [{key, header, cell(row), className, headClassName}]
export function DataTable({columns,rows,loading,error,onRetry,empty,rowKey='id',onRowClick,selectedKey,footer,toolbar,skeletonRows=5,caption}){
  const showSkeleton=loading&&!rows?.length;
  return <div className="grid gap-3">
    {toolbar}
    {error&&!rows?.length?<ErrorState error={error} onRetry={onRetry} title="Couldn’t load this list"/>
    :showSkeleton?<TableSkeleton rows={skeletonRows} columns={Math.min(columns.length,6)}/>
    :!rows?.length?empty
    :<div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        {caption&&<caption className="sr-only">{caption}</caption>}
        <TableHeader className="bg-muted/50"><TableRow className="hover:bg-transparent">{columns.map(column=><TableHead key={column.key} className={cn('h-10 text-xs font-medium tracking-wide text-muted-foreground uppercase',column.headClassName)}>{column.header}</TableHead>)}</TableRow></TableHeader>
        <TableBody className={cn(loading&&'opacity-60 transition-opacity')}>
          {rows.map(row=>{
            const key=typeof rowKey==='function'?rowKey(row):row[rowKey];
            return <TableRow key={key} data-state={selectedKey===key?'selected':undefined} className={cn(onRowClick&&'cursor-pointer')} onClick={onRowClick?()=>onRowClick(row):undefined} onKeyDown={onRowClick?event=>{if(event.key==='Enter'&&event.target===event.currentTarget)onRowClick(row);}:undefined} tabIndex={onRowClick?0:undefined}>
              {columns.map(column=><TableCell key={column.key} className={cn('py-3',column.className)}>{column.cell?column.cell(row):row[column.key]}</TableCell>)}
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </div>}
    {footer}
  </div>;
}

export function TableToolbar({children,end}){
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>{end&&<div className="flex flex-wrap items-center gap-2">{end}</div>}</div>;
}

export function SearchInput({value,onChange,placeholder='Search…',className}){
  return <Input type="search" data-search-input value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn('h-8 w-full sm:w-64',className)}/>;
}

export function LoadMore({onClick,loading,children='Load more'}){
  return <div className="flex justify-center"><Button type="button" variant="outline" disabled={loading} onClick={onClick}>{loading&&<Spinner/>}{loading?'Loading…':children}</Button></div>;
}

/* ---------- Form controls ---------- */

export function SwitchField({label,description,checked,onChange,disabled=false}){
  const id=useId();
  return <Field orientation="horizontal" className="rounded-lg border p-4">
    <FieldContent><FieldLabel htmlFor={id}>{label}</FieldLabel>{description&&<FieldDescription>{description}</FieldDescription>}</FieldContent>
    <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled}/>
  </Field>;
}

export function PasswordInput({id,value,onChange,autoComplete='current-password',showStrength=false,required=true,minLength,autoFocus,placeholder}){
  const [visible,setVisible]=useState(false);
  const strength=passwordStrength(value);
  const colors=['bg-destructive','bg-destructive','bg-amber-500','bg-emerald-500','bg-emerald-500'];
  return <div className="grid gap-2">
    <InputGroup>
      <InputGroupInput id={id} type={visible?'text':'password'} required={required} minLength={minLength} autoComplete={autoComplete} autoFocus={autoFocus} placeholder={placeholder} value={value} onChange={event=>onChange(event.target.value)}/>
      <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(current=>!current)}>{visible?<EyeOff/>:<Eye/>}</InputGroupButton></InputGroupAddon>
    </InputGroup>
    {showStrength&&value&&<div className="grid gap-1.5" aria-live="polite">
      <div className="flex gap-1">{[1,2,3,4].map(step=><span key={step} className={cn('h-1 flex-1 rounded-full bg-muted transition-colors',strength.score>=step&&colors[strength.score])}/>)}</div>
      <p className="text-xs text-muted-foreground">{strength.met?`${strength.label} password`:`${12-value.length} more character${12-value.length===1?'':'s'} needed`}</p>
    </div>}
  </div>;
}

// Appears at the bottom of a settings form once something changed.
export function SaveBar({dirty,busy,onSave,onReset,message='You have unsaved changes'}){
  if(!dirty)return null;
  return <div role="status" className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 animate-in slide-in-from-bottom-4 items-center justify-between gap-3 rounded-xl border bg-popover p-3 pl-4 text-popover-foreground shadow-xl md:left-[calc(50%+8rem)]">
    <span className="text-sm">{message}</span>
    <div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onReset}>Discard</Button><Button type="button" size="sm" disabled={busy} onClick={onSave}>{busy&&<Spinner/>}{busy?'Saving…':'Save changes'}</Button></div>
  </div>;
}

export {Kbd,KbdGroup} from '@/components/ui/kbd';
