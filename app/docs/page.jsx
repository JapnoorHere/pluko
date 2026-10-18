import { DocsPage } from "@/components/site/docs-page";
import { pageMetadata } from "@/lib/site-meta";

export const metadata = pageMetadata("/docs", {
  title: "API documentation — Pluko",
  description:
    "Integrate Pluko image search: authentication, asynchronous jobs, batch queries, filters, result pagination, webhooks and error handling.",
});

export default function Documentation() {
  return <DocsPage />;
}
