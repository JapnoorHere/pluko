// Pure helpers behind useListQuery: list state <-> URL, list state -> API parameters, and pagination numbers.
// Filter definitions look like {id, label, type:'multi'|'select'|'date', options?:[[value,label]]}.

export const PAGE_SIZES=[10,25,50,100];
export const DEFAULT_PAGE_SIZE=25;

const HOUR=3600000,DAY=86400000;
export const DATE_PRESETS=[['1h','Last hour',HOUR],['24h','Last 24 hours',DAY],['7d','Last 7 days',7*DAY],['30d','Last 30 days',30*DAY],['90d','Last 90 days',90*DAY]];
const PRESET_MS=Object.fromEntries(DATE_PRESETS.map(([value,,ms])=>[value,ms]));
const CUSTOM_RANGE=/^(\d{4}-\d{2}-\d{2})?\.\.(\d{4}-\d{2}-\d{2})?$/;

/** A date filter value is a preset ("7d") or a custom range of local dates ("2026-10-01..2026-10-18", either side optional). */
export function dateRange(value,now=Date.now()){
  if(!value)return null;
  if(PRESET_MS[value])return {from:now-PRESET_MS[value],to:null};
  const match=CUSTOM_RANGE.exec(value);
  if(!match||(!match[1]&&!match[2]))return null;
  return {from:match[1]?new Date(match[1]+'T00:00:00').getTime():null,to:match[2]?new Date(match[2]+'T23:59:59.999').getTime():null};
}

const shortDate=text=>new Date(text+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
export function describeDateRange(value){
  const preset=DATE_PRESETS.find(([key])=>key===value);
  if(preset)return preset[1];
  const match=CUSTOM_RANGE.exec(value||'');
  if(!match)return '';
  if(match[1]&&match[2])return `${shortDate(match[1])} – ${shortDate(match[2])}`;
  return match[1]?`Since ${shortDate(match[1])}`:`Until ${shortDate(match[2])}`;
}

const isEmpty=value=>value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length);

export function emptyState(defaults={}){
  return {q:'',page:1,pageSize:DEFAULT_PAGE_SIZE,sort:defaults.sort||'',filters:{...(defaults.filters||{})}};
}

/** Reads list state from a query string. `prefix` namespaces keys when one page has several synced lists. */
export function readState(search,definitions,defaults={},prefix=''){
  const params=new URLSearchParams(search),key=name=>prefix+name,state=emptyState(defaults);
  state.q=(params.get(key('q'))||'').slice(0,100);
  const page=Number(params.get(key('page')));if(Number.isInteger(page)&&page>0)state.page=page;
  const size=Number(params.get(key('page_size')));if(PAGE_SIZES.includes(size))state.pageSize=size;
  if(params.get(key('sort')))state.sort=params.get(key('sort'));
  for(const def of definitions){
    const raw=params.get(key(def.id));
    if(raw===null)continue;
    const allowed=def.options?new Set(def.options.map(([value])=>String(value))):null;
    if(def.type==='multi'){const values=raw.split(',').filter(value=>value&&(!allowed||allowed.has(value)));state.filters[def.id]=values;}
    else if(def.type==='date'){state.filters[def.id]=dateRange(raw)?raw:'';}
    else state.filters[def.id]=!allowed||allowed.has(raw)?raw:'';
  }
  return state;
}

/** Writes list state into a query string, leaving other keys alone and omitting defaults to keep URLs short. */
export function writeState(search,state,definitions,defaults={},prefix=''){
  const params=new URLSearchParams(search),key=name=>prefix+name;
  const set=(name,value,fallback)=>{if(isEmpty(value)||value===fallback)params.delete(key(name));else params.set(key(name),Array.isArray(value)?value.join(','):String(value));};
  set('q',state.q.trim(),'');
  set('page',state.page,1);
  set('page_size',state.pageSize,DEFAULT_PAGE_SIZE);
  set('sort',state.sort,defaults.sort||'');
  for(const def of definitions)set(def.id,state.filters[def.id],defaults.filters?.[def.id]);
  const text=params.toString();
  return text?'?'+text:'';
}

/** API query parameters for the current state. Date filters become <id>_from / <id>_to in epoch milliseconds. */
export function apiParams(state,definitions,fixed={},now=Date.now()){
  const params=new URLSearchParams();
  for(const [name,value] of Object.entries(fixed))if(!isEmpty(value))params.set(name,String(value));
  if(state.q.trim())params.set('q',state.q.trim());
  if(state.sort)params.set('sort',state.sort);
  params.set('page',String(state.page));
  params.set('page_size',String(state.pageSize));
  for(const def of definitions){
    const value=state.filters[def.id];
    if(isEmpty(value))continue;
    if(def.type==='date'){const range=dateRange(value,now);if(range?.from!=null)params.set(def.id+'_from',String(range.from));if(range?.to!=null)params.set(def.id+'_to',String(range.to));}
    else params.set(def.id,Array.isArray(value)?value.join(','):String(value));
  }
  return params;
}

/** How many filters (not search or sort) are set, for the "Filters (3)" badge. */
export const activeFilterCount=(state,definitions)=>definitions.filter(def=>!isEmpty(state.filters[def.id])).length;

/** Page numbers to show, with '…' gaps: [1,'…',4,5,6,'…',20]. */
export function pageWindow(page,pages,around=1){
  if(pages<=7)return Array.from({length:pages},(_,i)=>i+1);
  const set=new Set([1,pages]);
  for(let n=page-around;n<=page+around;n++)if(n>1&&n<pages)set.add(n);
  if(page<=3)[2,3,4].forEach(n=>set.add(n));
  if(page>=pages-2)[pages-1,pages-2,pages-3].forEach(n=>set.add(n));
  const sorted=[...set].sort((a,b)=>a-b),out=[];
  sorted.forEach((n,i)=>{if(i&&n-sorted[i-1]>1)out.push('…');out.push(n);});
  return out;
}

/** "26–50 of 1,284" */
export function rangeLabel(page,pageSize,total){
  if(!total)return '0 results';
  const first=(page-1)*pageSize+1,last=Math.min(total,page*pageSize);
  return `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`;
}

/** Next sort value when a column header is clicked: same column flips direction, a new column starts descending. */
export function nextSort(current,column,firstDirection='desc'){
  const [field,direction]=splitSort(current);
  if(field===column)return `${column}_${direction==='desc'?'asc':'desc'}`;
  return `${column}_${firstDirection}`;
}
export function splitSort(value){
  const match=/^(.*)_(asc|desc)$/.exec(value||'');
  return match?[match[1],match[2]]:[value||'',null];
}
