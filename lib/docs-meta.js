// Page metadata and structured data for each docs page, kept apart from the client docs component.
import { DOCS_UPDATED, docsPage, docsPath } from './docs-pages.js';
import { breadcrumbs, techArticle } from './jsonld.js';
import { pageMetadata } from './site-meta.js';

export function docsMetadata(slug) {
  const page = docsPage(slug);
  return pageMetadata(docsPath(slug), { title: page.title, description: page.description });
}

export function docsJsonLd(slug, origin) {
  const page = docsPage(slug);
  const path = docsPath(slug);
  const trail = [['Pluko', '/'], ['Documentation', '/docs']];
  if (slug) trail.push([page.nav, path]);
  return [breadcrumbs(trail, origin), techArticle({ path, title: page.title, description: page.description, updated: DOCS_UPDATED }, origin)];
}
