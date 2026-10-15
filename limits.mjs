// Single source of truth for product limits. Shared by the API, worker, dashboard, docs and limits page.
export const LIMITS=Object.freeze({
  imagesPerPage:35,
  defaultDailyPages:200,
  maxDailyPages:1000000,
  keyPerMinute:120,
  accountPerMinute:240,
  ipPerMinute:300,
  activeJobsPerProject:10,
  requestBodyBytes:65536,
  resultsPageMax:100,
  queryMaxLength:200,
  keyDaysDefault:90,
  keyDaysMax:365,
  passwordMin:12,
  sessionHours:12,
});

export const dayKey=(time=Date.now())=>new Date(time).toISOString().slice(0,10);
export const nextReset=(time=Date.now())=>{const d=new Date(time);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1);};

// project: {id,name,daily_pages}; rows: [{day,pages}] for that project (any order)
export function summarizeUsage(project,rows,time=Date.now()){
  const today=dayKey(time),used=rows.find(row=>row.day===today)?.pages||0;
  return {
    project_id:project.id,
    project:project.name,
    day:today,
    pages_used:used,
    pages_quota:project.daily_pages,
    pages_remaining:Math.max(0,project.daily_pages-used),
    resets_at:nextReset(time),
    images_per_page:LIMITS.imagesPerPage,
    history:[...rows].sort((a,b)=>b.day.localeCompare(a.day)).slice(0,7).map(row=>({day:row.day,pages:row.pages})),
  };
}
