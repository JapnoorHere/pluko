// Optional search filters. Pure functions so they are easy to test and independent of any one provider.
export const FILTER_VALUES=Object.freeze({
  safe_search:['moderate','strict'],
  image_type:['any','photo','clipart','line_drawing','animated_gif','transparent'],
  layout:['any','square','wide','tall'],
  size:['any','small','medium','large','wallpaper'],
  color:['any','color','black_white','red','orange','yellow','green','teal','blue','purple','pink','brown','black','gray','white'],
});
const DEFAULTS=Object.freeze({safe_search:'moderate',image_type:'any',layout:'any',size:'any',color:'any'});

// Returns only the filters that differ from the defaults, so jobs created without filters keep the same stored payload.
// `fail(code,message)` must throw; the caller decides the error type.
export function parseFilters(input,fail) {
  const filters={};
  for(const [name,allowed] of Object.entries(FILTER_VALUES)){
    const value=input[name];
    if(value===undefined||value===null)continue;
    if(typeof value!=='string'||!allowed.includes(value))fail('INVALID_FILTER',`${name} must be one of: ${allowed.join(', ')}`);
    if(value!==DEFAULTS[name])filters[name]=value;
  }
  return filters;
}

const TYPE={photo:'photo-photo',clipart:'photo-clipart',line_drawing:'photo-linedrawing',animated_gif:'photo-animatedgif',transparent:'photo-transparent'};
const COLOR_NAMES=['red','orange','yellow','green','teal','blue','purple','pink','brown','black','gray','white'];

// Maps filters to Bing's `adlt` and `qft` query parameters. Treat as best effort: Bing may change them.
export function bingParameters(filters={}) {
  const parts=[];
  if(filters.image_type&&TYPE[filters.image_type])parts.push(`+filterui:${TYPE[filters.image_type]}`);
  if(filters.layout&&filters.layout!=='any')parts.push(`+filterui:aspect-${filters.layout}`);
  if(filters.size&&filters.size!=='any')parts.push(`+filterui:imagesize-${filters.size}`);
  if(filters.color&&filters.color!=='any'){
    if(filters.color==='color')parts.push('+filterui:color2-color');
    else if(filters.color==='black_white')parts.push('+filterui:color2-bw');
    else if(COLOR_NAMES.includes(filters.color))parts.push(`+filterui:color2-FGcls_${filters.color.toUpperCase()}`);
  }
  const parameters={adlt:filters.safe_search==='strict'?'strict':'moderate'};
  if(parts.length)parameters.qft=parts.join('');
  return parameters;
}
