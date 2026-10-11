import { llmsTxt } from '../../lib/llms-txt.js';

// Built per request so the real domain from PUBLIC_ORIGIN is used, like robots.txt and the sitemap.
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(llmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
