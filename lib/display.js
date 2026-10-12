export const format=value=>value?new Date(value).toLocaleString():'—';
export const short=value=>value?`${value.slice(0,15)}…`:'—';
