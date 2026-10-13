// The documentation is split into pages so each topic has its own address, title and description
// for search engines. Section ids are unique across all pages; docHref() finds a section's page.
// Change `updated` when a page's text changes: it feeds the sitemap and structured data.

export const DOCS_UPDATED = '2026-11-14';

export const DOCS_PAGES = [
  {
    slug: '',
    nav: 'Get started',
    heading: 'Your first image search.',
    title: 'Image Search API Quick Start — Pluko Docs',
    description: 'Create an API key and run your first image search with cURL, JavaScript or Python. Authentication, scopes and environment setup for the Pluko image search API.',
    lede: 'Call Pluko over HTTP from your backend: create a search job, follow its progress, and read image URLs and metadata. No SDK required.',
    sections: [
      ['quickstart', 'Quick start', 'api key environment first request 202'],
      ['authentication', 'Authentication', 'bearer token scopes search read revoke'],
    ],
  },
  {
    slug: 'jobs',
    nav: 'Jobs and results',
    heading: 'Jobs and results',
    title: 'Image Search Jobs, Results and Pagination — Pluko Docs',
    description: 'How Pluko image search jobs work: statuses, waiting for results, webhooks or polling, cursor pagination and safe retries with idempotency keys.',
    lede: 'Every search runs as a background job. Here is how to follow it, get its images back and retry safely.',
    sections: [
      ['jobs', 'Jobs and statuses', 'queued running complete partial cancelled reason'],
      ['delivery', 'Getting results', 'wait webhook poll Prefer respond-async delivery'],
      ['pagination', 'Reading results', 'next_cursor after poll_after limit page'],
      ['idempotency', 'Retries and idempotency', 'idempotency-key 409 conflict retry'],
    ],
  },
  {
    slug: 'api-reference',
    nav: 'API reference',
    heading: 'API reference',
    title: 'Image Search API Reference: Endpoints and Parameters — Pluko Docs',
    description: 'Every Pluko image search API endpoint: create a search, get a job, read results, list, cancel and retry jobs, send feedback, check usage and service status.',
    lede: 'Every public endpoint, its parameters and an example request.',
    sections: [
      ['create-search', 'Create a search', 'POST /v1/images/search query count min_width'],
      ['get-job', 'Get a job', 'GET /v1/jobs/{job_id} status'],
      ['get-results', 'Read results', 'GET /v1/jobs/{job_id}/results images'],
      ['list-jobs', 'List jobs', 'GET /v1/jobs before status'],
      ['cancel-retry', 'Cancel and retry', 'POST cancel retry JOB_FINISHED'],
      ['feedback', 'Send feedback', 'POST /v1/feedback not_relevant watermark broken'],
      ['usage', 'Usage', 'GET /v1/usage pages quota reset'],
      ['status', 'Service status', 'GET /v1/status worker provider'],
    ],
  },
  {
    slug: 'batch-search',
    nav: 'Batch searches',
    heading: 'Batch image search',
    title: 'Bulk Image Search API: Many Queries in One Job — Pluko Docs',
    description: 'Search images for hundreds of queries in one API request. How Pluko batch searches work, size limits, per-query counts and reading results grouped by query.',
    lede: 'Send many queries in one job instead of looping over single searches.',
    sections: [
      ['batches', 'Batch searches', 'queries array 64 KiB bulk'],
    ],
  },
  {
    slug: 'filters',
    nav: 'Filters',
    heading: 'Search filters',
    title: 'Image Search API Filters: Size, Colour, Layout and Type — Pluko Docs',
    description: 'Filter image search results by size, colour, layout, image type, minimum width, domains and safe search with the Pluko image search API.',
    lede: 'Narrow results by size, shape, colour and type, or skip the sites you don’t want.',
    sections: [
      ['filters', 'Filters', 'safe_search image_type layout size color INVALID_FILTER min_width exclude_domains'],
    ],
  },
  {
    slug: 'webhooks',
    nav: 'Webhooks',
    heading: 'Webhooks',
    title: 'Image Search Webhooks and Signature Verification — Pluko Docs',
    description: 'Get a signed job.finished webhook when a Pluko image search ends. Event body, HMAC-SHA256 signature verification in Node.js, retries and endpoint rules.',
    lede: 'Let Pluko tell your server when a search is done, instead of checking back.',
    sections: [
      ['webhooks', 'Webhooks', 'job.finished signature hmac Pluko-Signature retries'],
    ],
  },
  {
    slug: 'errors',
    nav: 'Errors and limits',
    heading: 'Errors and limits',
    title: 'Image Search API Errors and Rate Limits — Pluko Docs',
    description: 'Pluko image search API error format, HTTP status codes (400, 401, 403, 409, 413, 429), Retry-After handling and per-key and per-account rate limits.',
    lede: 'What each error means and the limits every account works within.',
    sections: [
      ['errors', 'Errors and limits', '401 403 400 409 413 429 Retry-After rate limit'],
    ],
  },
  {
    slug: 'image-metadata',
    nav: 'Image metadata',
    heading: 'Image metadata and reuse',
    title: 'Image Search Result Fields and Metadata — Pluko Docs',
    description: 'What each Pluko image search result field means: image URL, thumbnail, source page, dimensions, license and watermark hints, plus the OpenAPI schema and data retention.',
    lede: 'What every result field means, and what to check before you reuse an image.',
    sections: [
      ['metadata', 'Image metadata and reuse', 'image_url thumbnail_url source_url license watermark dimensions'],
      ['openapi', 'OpenAPI and tools', 'openapi.json postman insomnia retention expires'],
    ],
  },
];

export const docsPath = slug => (slug ? `/docs/${slug}` : '/docs');
export const DOCS_PATHS = DOCS_PAGES.map(page => docsPath(page.slug));
export const docsPage = slug => DOCS_PAGES.find(page => page.slug === slug);
export const pageOfSection = id => DOCS_PAGES.find(page => page.sections.some(([sectionId]) => sectionId === id));

// Link to a section on whichever page holds it. Unknown ids fall back to the docs home.
export function docHref(id) {
  const page = pageOfSection(id);
  return page ? `${docsPath(page.slug)}#${id}` : '/docs';
}
