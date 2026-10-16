// Applied before first paint so nobody sees a flash of the wrong theme.
// Workspace URLs follow the user's stored choice, the home page is light, and every other public page stays dark.
// The key matches components/workspace/theme.jsx.
export const THEME_KEY='pluko-theme';
export const THEME_SCRIPT=`try{var p=location.pathname,m=null;if(p==='/app'||p==='/admin'||p.indexOf('/app/')===0||p.indexOf('/admin/')===0){var t=localStorage.getItem('${THEME_KEY}')||'system';m=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;}else if(p==='/'){m='light';}if(m){var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.classList.toggle('light',m==='light');}}catch(e){}`;
