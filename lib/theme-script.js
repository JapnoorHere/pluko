// Applied before first paint so nobody sees a flash of the wrong theme.
// Workspace URLs follow the user's stored choice; every public page is light.
// The key matches components/workspace/theme.jsx.
export const THEME_KEY='pluko-theme';
export const THEME_SCRIPT=`try{var p=location.pathname,m='light';if(p==='/app'||p==='/admin'||p.indexOf('/app/')===0||p.indexOf('/admin/')===0){var t=localStorage.getItem('${THEME_KEY}')||'system';m=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;}var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.classList.toggle('light',m==='light');}catch(e){}`;
