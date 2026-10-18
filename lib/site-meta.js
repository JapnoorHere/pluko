// Public address and share metadata for the marketing and docs pages.
// PUBLIC_ORIGIN is read when the module loads: at build time for prerendered pages
// (Docker passes it as a build argument) and at request time for robots.txt and the sitemap.

export const PUBLIC_PAGES = ['/', '/docs', '/limits', '/status', '/contact', '/privacy', '/terms'];
export const PRIVATE_PATHS = ['/app', '/admin', '/api/', '/v1/'];

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
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

export function sitemapEntries(origin) {
  const base = siteUrl(origin);
  return PUBLIC_PAGES.map(path => ({
    url: base + (path === '/' ? '' : path),
    changeFrequency: path === '/status' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : path === '/docs' ? 0.8 : 0.5,
  }));
}
