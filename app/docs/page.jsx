import { DocsPage } from "@/components/site/docs-page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbs, techArticle } from "@/lib/jsonld";
import { PAGE_UPDATED, pageMetadata } from "@/lib/site-meta";

const title = "Image Search API Documentation — Pluko";
const description =
  "Integrate Pluko image search: authentication, asynchronous jobs, batch queries, filters, result pagination, webhooks and error handling.";

export const metadata = pageMetadata("/docs", { title, description });

export default function Documentation() {
  return (
    <>
      <JsonLd nodes={[breadcrumbs([["Pluko", "/"], ["Documentation", "/docs"]]), techArticle({ path: "/docs", title, description, updated: PAGE_UPDATED["/docs"] })]} />
      <DocsPage />
    </>
  );
}
