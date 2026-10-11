// Public address and share metadata for the marketing and docs pages.
// PUBLIC_ORIGIN is read when the module loads: at build time for prerendered pages
// (Docker passes it as a build argument) and at request time for robots.txt and the sitemap.

// Pages listed in the sitemap, with the date their content last changed.
// Update the date when a page's text changes so search engines recrawl it.
// /status is live data with little text, so it stays reachable but is not listed.
export const PAGE_UPDATED = {
  '/': '2026-11-14',
  '/docs': '2026-11-14',
  '/limits': '2026-10-15',
  '/contact': '2026-10-15',
  '/privacy': '2026-10-15',
  '/terms': '2026-10-15',
};
export const PUBLIC_PAGES = Object.keys(PAGE_UPDATED);
export const PRIVATE_PATHS = ['/app', '/admin', '/api/', '/v1/'];
// Public files under private paths that crawlers and AI tools may read.
export const PUBLIC_FILES = ['/v1/openapi.json'];
// Search and AI assistant crawlers named explicitly so the intent is clear: they are welcome on public pages.
export const AI_CRAWLERS = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];

export function siteUrl(origin = process.env.PUBLIC_ORIGIN) {
  return (origin || 'http://127.0.0.1:4180').replace(/\/+$/, '');
}

// Title, description, canonical link and share cards for one public page.
// The share image is drawn by app/opengraph-image.jsx. It is listed here because a page's own
// openGraph settings replace the inherited image.
export const SHARE_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Pluko — Every image. One API.' };

export function pageMetadata(path, { title, description, shareDescription = description }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description: shareDescription, url: path, siteName: 'Pluko', type: 'website', locale: 'en_US', images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: shareDescription, images: [SHARE_IMAGE.url] },
  };
}

export function robotsRules(origin) {
  const base = siteUrl(origin);
  return {
    rules: [
      { userAgent: '*', allow: ['/', ...PUBLIC_FILES], disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: ['/', ...PUBLIC_FILES], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

export function sitemapEntries(origin) {
  const base = siteUrl(origin);
  return PUBLIC_PAGES.map(path => ({
    url: base + (path === '/' ? '' : path),
    lastModified: PAGE_UPDATED[path],
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : path === '/docs' ? 0.8 : 0.5,
  }));
}
