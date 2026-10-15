'use client';

import {useId,useState} from 'react';
import {Field,FieldContent,FieldLabel,FieldDescription} from '@/components/ui/field';
import {Button as ShadButton} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter} from '@/components/ui/alert-dialog';

export function StatusBadge({status}) {
  return <Badge variant="outline" className={["queued","running"].includes(status)?"border-primary/25 bg-primary/10 text-primary":undefined}>{status}</Badge>;
}

export function Toggle({label,description,checked,onChange,disabled=false}) {
  const id=useId();
  return <Field orientation="horizontal"><FieldContent><FieldLabel htmlFor={id}>{label}</FieldLabel><FieldDescription>{description}</FieldDescription></FieldContent><Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled}/></Field>;
}

export function ConfirmAction({title,description,action,onCancel,onConfirm}) {
  const [busy,setBusy]=useState(false);
  return <><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><ShadButton variant="outline" onClick={onCancel}>Cancel</ShadButton><ShadButton variant="destructive" disabled={busy} onClick={async()=>{setBusy(true);try{await onConfirm();}finally{setBusy(false)}}}>{busy?'Working…':action}</ShadButton></AlertDialogFooter></>;
}

export function Modal({children,close}) {
  if(children?.type===ConfirmAction)return <AlertDialog open onOpenChange={open=>{if(!open)close()}}><AlertDialogContent>{children}</AlertDialogContent></AlertDialog>;
  return <Dialog open onOpenChange={open=>{if(!open)close()}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Details</DialogTitle></DialogHeader><div className="modalBody">{children}</div></DialogContent></Dialog>;
}
