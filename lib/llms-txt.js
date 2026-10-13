// /llms.txt: a short plain-text guide for AI assistants and coding tools (https://llmstxt.org).
// Numbers come from limits.mjs so this file never disagrees with the docs.
import { LIMITS } from '../limits.mjs';
import { siteUrl } from './site-meta.js';
import { SOURCE_URL } from './jsonld.js';

export function llmsTxt(origin) {
  const base = siteUrl(origin);
  const docs = section => `${base}/docs#${section}`;
  return `# Pluko

> Pluko is an image search API for developers. Send a search query and get back image URLs, source pages and metadata (title, width, height, thumbnail, domain) as JSON. One query or thousands of queries run in a single background job. Pluko returns links to images on the web; it never hosts, downloads or stores image files.

Key facts:
- REST API under ${base}/v1/ with bearer API keys (scopes: search, read). Keys belong on a server, never in browser code.
- A search is an asynchronous job: POST /v1/images/search returns 202 with a job_id, then read GET /v1/jobs/{job_id} and GET /v1/jobs/{job_id}/results (up to ${LIMITS.resultsPageMax} images per page, cursor pagination).
- Results can also be delivered by waiting briefly on the request (Prefer: wait=N, up to 10 seconds) or by a signed job.finished webhook.
- Filters: min_width, exclude_domains, watermark_policy, safe_search, image_type, layout, size, color.
- Default limits: ${LIMITS.keyPerMinute} requests per minute per key, ${LIMITS.defaultDailyPages} source pages per project per day (about ${LIMITS.imagesPerPage} images per page), ${LIMITS.activeJobsPerProject} active jobs per project.
- Search results do not grant reuse rights. Check each image's source and license before reuse.
- Free during the beta. Source code is open under AGPL-3.0.

## Docs

- [Quick start](${docs('quickstart')}): create a key and run a first search with cURL, JavaScript or Python
- [Authentication](${docs('authentication')}): bearer keys and scopes
- [Jobs and statuses](${docs('jobs')}): queued, running, complete, partial, cancelled and per-query reasons
- [Getting results](${docs('delivery')}): check back, wait for results, or webhook
- [Create a search](${docs('create-search')}): POST /v1/images/search parameters
- [Batch searches](${docs('batches')}): many queries in one job
- [Filters](${docs('filters')}): size, colour, layout, type and safe search
- [Webhooks](${docs('webhooks')}): signed job.finished events and signature checks
- [Errors and limits](${docs('errors')}): error codes and what to do about them
- [Image metadata and reuse](${docs('metadata')}): what each result field means

## API reference

- [OpenAPI 3.1 schema](${base}/v1/openapi.json): machine-readable description of every public endpoint, for generating typed clients

## Switching from another API

- [Bing Image Search API alternative](${base}/alternatives/bing-image-search-api): the Bing Search APIs were retired on August 11, 2025; field mapping and migration
- [Google Custom Search JSON API alternative](${base}/alternatives/google-custom-search-api): closed to new customers, discontinued January 1, 2027; image search migration

## Optional

- [Limits](${base}/limits): rates, daily usage and data retention
- [Status](${base}/status): live service check
- [Contact](${base}/contact): support and security reports
- [Source code](${SOURCE_URL}): self-host Pluko
`;
}
