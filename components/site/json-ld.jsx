import { jsonLdScript } from '@/lib/jsonld';

// Renders schema.org structured data for a public page. Server component, no client JavaScript.
export function JsonLd({ nodes }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(nodes) }} />;
}
