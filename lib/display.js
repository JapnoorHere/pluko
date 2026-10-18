export const format=value=>value?new Date(value).toLocaleString():'—';
export const short=value=>value?`${value.slice(0,15)}…`:'—';

const reasons={
  requested_count_reached:'All requested images were found.',
  source_exhausted_or_no_new_matches:'The source ran out of new matching images.',
  daily_page_quota:'Stopped at the project’s daily page limit. It resets at 00:00 UTC.',
  provider_failed:'The image source kept failing for this query.',
  key_revoked_or_expired:'The API key was revoked or expired during the job.',
  user_cancelled:'Cancelled.',
};
export const reasonText=value=>value?reasons[value]||value:'—';

export function daysLeft(timestamp,now=Date.now()){
  if(!timestamp)return null;
  return Math.ceil((timestamp-now)/86400000);
}
export function expiryText(timestamp,now=Date.now()){
  const days=daysLeft(timestamp,now);
  if(days===null)return 'Never';
  if(days<=0)return 'Expired';
  return days===1?'Tomorrow':`In ${days} days`;
}

export const IMAGES_PER_PAGE=35;
export function usageShare(used,quota){
  if(!quota)return 0;
  return Math.min(100,Math.round((used/quota)*100));
}

export function csvCell(value){
  const text=value===null||value===undefined?'':String(value);
  const safe=/^[=+\-@\t\r]/.test(text)?`'${text}`:text;
  return /[",\n\r]/.test(safe)?`"${safe.replaceAll('"','""')}"`:safe;
}
export const resultColumns=['query','title','image_url','thumbnail_url','source_url','source_domain','width','height','license_status','watermark_hint'];
export function resultsToCsv(rows){
  return [resultColumns.join(','),...rows.map(row=>resultColumns.map(column=>csvCell(row[column])).join(','))].join('\n');
}

// Waitlist rows as CSV, with the sign-up time in ISO 8601 (UTC).
export function waitlistToCsv(entries){
  return ['email,signed_up_at',...entries.map(entry=>[csvCell(entry.email),csvCell(new Date(entry.created).toISOString())].join(','))].join('\n');
}

export function downloadText(filename,text,type){
  const blob=new Blob([text],{type});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

export async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}
  catch{
    const area=document.createElement('textarea');
    area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';
    document.body.appendChild(area);area.select();
    let ok=false;try{ok=document.execCommand('copy');}catch{}
    area.remove();return ok;
  }
}
