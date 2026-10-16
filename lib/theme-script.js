// Workspace theme, applied before first paint so a light-theme user never sees a dark flash.
// It only acts on workspace URLs; the public site stays dark. The key matches components/workspace/theme.jsx.
export const THEME_KEY='pluko-theme';
export const THEME_SCRIPT=`try{var p=location.pathname;if(p==='/app'||p==='/admin'||p.indexOf('/app/')===0||p.indexOf('/admin/')===0){var t=localStorage.getItem('${THEME_KEY}')||'system';var m=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.classList.toggle('light',m==='light');}}catch(e){}`;
