import { robotsRules } from '../lib/site-meta.js';

// Built per request so the real domain from PUBLIC_ORIGIN is used.
export const dynamic = 'force-dynamic';

export default function robots() {
  return robotsRules();
}
