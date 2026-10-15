import {IMAGES_PER_PAGE} from './display.js';

// Distinct, trimmed, non-empty lines; the API rejects repeated queries, so repeats are merged here.
export function parseQueries(text) {
  const seen=new Set(),queries=[];
  for(const line of String(text).split('\n')){
    const query=line.trim().replace(/\s+/g,' ');
    if(query&&!seen.has(query.toLowerCase())){seen.add(query.toLowerCase());queries.push(query);}
  }
  return queries;
}

export function parseDomains(text) {
  return [...new Set(String(text).split(/[\s,]+/).map(domain=>domain.trim().toLowerCase()).filter(Boolean))];
}

// Provider pages a job will use at most, or null when the count is not a positive whole number.
export function estimatePages(count,queries) {
  if(!/^[1-9]\d*$/.test(count)||count.length>15)return null;
  return Math.ceil(Number(count)/IMAGES_PER_PAGE)*queries;
}
