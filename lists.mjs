// Paginated, filtered, sorted lists for the workspace API (/api/*).
// Every value reaches SQL as a parameter; column names, operators and sort orders come only from the
// fixed definitions passed in by each endpoint, never from the request.
import {ApiError} from './jobs.mjs';

export const PAGE_SIZES=Object.freeze([10,25,50,100]);
export const DEFAULT_PAGE_SIZE=25;
const MAX_PAGE=100000;
const MAX_SEARCH=100;
const MAX_VALUES=20;
const fail=(code,message)=>{throw new ApiError(400,code,message);};

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. Use with ESCAPE '\'. */
export const escapeLike=text=>String(text).replace(/[\\%_]/g,c=>'\\'+c);

/** Values for one filter: repeated params and comma-separated lists both work (?status=a&status=b or ?status=a,b). */
function valuesOf(url,name){
  const values=url.searchParams.getAll(name).flatMap(v=>v.split(',')).map(v=>v.trim()).filter(Boolean);
  if(values.length>MAX_VALUES)fail('INVALID_FILTER',`${name} accepts at most ${MAX_VALUES} values`);
  return values;
}

/** Rows a single export may return. Larger exports should narrow their filters. */
export const EXPORT_MAX=10000;

export function pageParams(url){
  // ?export=1 returns every matching row (up to EXPORT_MAX) in one response, for CSV downloads.
  if(url.searchParams.get('export')==='1')return {page:1,page_size:EXPORT_MAX};
  const rawPage=url.searchParams.get('page')??'1',rawSize=url.searchParams.get('page_size')??String(DEFAULT_PAGE_SIZE);
  const page=Number(rawPage),page_size=Number(rawSize);
  if(!Number.isInteger(page)||page<1||page>MAX_PAGE)fail('INVALID_PAGE',`page must be a whole number from 1 to ${MAX_PAGE}`);
  if(!PAGE_SIZES.includes(page_size))fail('INVALID_PAGE_SIZE',`page_size must be one of ${PAGE_SIZES.join(', ')}`);
  return {page,page_size};
}

/* ---------- filter definitions ----------
   Each returns {params:[names], apply(url) -> {sql, values} | null}. */

/** Exact match on any of the allowed values (multi-select). */
export const oneOf=(name,column,allowed)=>({params:[name],apply(url){
  const values=valuesOf(url,name);if(!values.length)return null;
  for(const v of values)if(!allowed.includes(v))fail('INVALID_FILTER',`${name} must be one of: ${allowed.join(', ')}`);
  return {sql:`${column} IN (${values.map(()=>'?').join(',')})`,values};
}});

/** Exact match on an identifier, e.g. a project or key ID. */
export const equals=(name,column,{max=64}={})=>({params:[name],apply(url){
  const values=valuesOf(url,name);if(!values.length)return null;
  for(const v of values)if(v.length>max)fail('INVALID_FILTER',`${name} is too long`);
  return {sql:`${column} IN (${values.map(()=>'?').join(',')})`,values};
}});

/** Named conditions, e.g. {active:'revoked=0 AND …', revoked:'revoked=1'}. Several chosen values are ORed.
    A condition may be a function of the current time for "expiring soon" style filters. */
export const choice=(name,conditions)=>({params:[name],apply(url){
  const values=valuesOf(url,name);if(!values.length)return null;
  const parts=[],params=[];
  for(const v of values){
    const condition=Object.hasOwn(conditions,v)?conditions[v]:null;
    if(!condition)fail('INVALID_FILTER',`${name} must be one of: ${Object.keys(conditions).join(', ')}`);
    const {sql,values:extra=[]}=typeof condition==='function'?condition(Date.now()):{sql:condition};
    parts.push('('+sql+')');params.push(...extra);
  }
  return {sql:parts.length>1?'('+parts.join(' OR ')+')':parts[0],values:params};
}});

/** A time range on an epoch-millisecond column: ?created_from=…&created_to=… (epoch ms or ISO 8601). */
export const range=(name,column)=>({params:[name+'_from',name+'_to'],apply(url){
  const parse=key=>{
    const raw=url.searchParams.get(key);if(raw===null||raw==='')return null;
    const value=/^\d+$/.test(raw)?Number(raw):Date.parse(raw);
    if(!Number.isSafeInteger(value)||value<0)fail('INVALID_FILTER',`${key} must be a date or epoch milliseconds`);
    return value;
  };
  const from=parse(name+'_from'),to=parse(name+'_to');
  if(from===null&&to===null)return null;
  if(from!==null&&to!==null&&from>to)fail('INVALID_FILTER',`${name}_from must be before ${name}_to`);
  const parts=[],values=[];
  if(from!==null){parts.push(`${column}>=?`);values.push(from);}
  if(to!==null){parts.push(`${column}<=?`);values.push(to);}
  return {sql:parts.join(' AND '),values};
}});

/**
 * Runs a list query.
 * spec: {select, from, where?:[sql], params?:[values], filters?:[definition], search?:[columns], sorts:{key:'ORDER BY sql'}, defaultSort}
 * Returns {items, page, page_size, total, has_more, sort}.
 */
export function list(db,url,spec){
  const clauses=[...(spec.where||[])],values=[...(spec.params||[])];
  for(const filter of spec.filters||[]){const out=filter.apply(url);if(out){clauses.push(out.sql);values.push(...out.values);}}
  const q=(url.searchParams.get('q')||'').trim();
  if(q){
    if(q.length>MAX_SEARCH)fail('INVALID_SEARCH',`Search text must be ${MAX_SEARCH} characters or fewer`);
    if(spec.search?.length){
      // A search entry is a column name, or a function of the LIKE pattern for searching related rows.
      const pattern='%'+escapeLike(q)+'%',parts=[];
      for(const entry of spec.search){
        if(typeof entry==='function'){const out=entry(pattern);parts.push(out.sql);values.push(...out.values);}
        else{parts.push(`${entry} LIKE ? ESCAPE '\\'`);values.push(pattern);}
      }
      clauses.push('('+parts.join(' OR ')+')');
    }
  }
  const sort=url.searchParams.get('sort')||spec.defaultSort;
  if(!Object.hasOwn(spec.sorts,sort))fail('INVALID_SORT',`sort must be one of: ${Object.keys(spec.sorts).join(', ')}`);
  const {page,page_size}=pageParams(url);
  const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
  const total=db.get(`SELECT count(*) n FROM ${spec.from}${where}`,...values).n;
  const items=db.all(`SELECT ${spec.select} FROM ${spec.from}${where} ORDER BY ${spec.sorts[sort]} LIMIT ? OFFSET ?`,...values,page_size,(page-1)*page_size);
  return {items,page,page_size,total,has_more:page*page_size<total,sort};
}

/** The pagination fields of a list result, for responses that name their item array. */
export const pageInfo=result=>({page:result.page,page_size:result.page_size,total:result.total,has_more:result.has_more,sort:result.sort});
