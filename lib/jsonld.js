// Structured data (schema.org JSON-LD) for public pages.
// It tells search engines and AI assistants what Pluko is, who runs it and what it costs.
// Keep every claim here true and in step with the visible page text.
import { legal } from './legal.js';
import { siteUrl } from './site-meta.js';

export const SOURCE_URL = 'https://github.com/JapnoorHere/pluko';
const DESCRIPTION = 'Pluko is an image search API that returns image URLs, sources and metadata for any query, one query or thousands in a single job.';

export function organization(origin) {
  const base = siteUrl(origin);
  return {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: 'Pluko',
    url: base,
    logo: `${base}/logo.png`,
    email: legal.email,
    parentOrganization: { '@type': 'Organization', name: legal.operator, url: legal.website },
    sameAs: [SOURCE_URL],
  };
}

export function website(origin) {
  const base = siteUrl(origin);
  return { '@type': 'WebSite', '@id': `${base}/#website`, name: 'Pluko', url: base, description: DESCRIPTION, publisher: { '@id': `${base}/#organization` }, inLanguage: 'en' };
}

export function softwareApplication(origin) {
  const base = siteUrl(origin);
  return {
    '@type': 'SoftwareApplication',
    '@id': `${base}/#software`,
    name: 'Pluko Image Search API',
    url: base,
    description: DESCRIPTION,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    softwareHelp: `${base}/docs`,
    license: 'https://www.gnu.org/licenses/agpl-3.0.html',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free during the beta, within the published limits.' },
    publisher: { '@id': `${base}/#organization` },
  };
}

export function faqPage(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  };
}

export function breadcrumbs(items, origin) {
  const base = siteUrl(origin);
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: base + (path === '/' ? '' : path) })),
  };
}

export function techArticle({ path, title, description, updated }, origin) {
  const base = siteUrl(origin);
  return {
    '@type': 'TechArticle',
    headline: title,
    description,
    url: base + path,
    dateModified: updated,
    inLanguage: 'en',
    author: { '@id': `${base}/#organization` },
    publisher: { '@id': `${base}/#organization` },
    about: { '@id': `${base}/#software` },
  };
}

// One script body for several nodes. "<" is escaped so page text can never close the script tag.
export function jsonLdScript(nodes) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
