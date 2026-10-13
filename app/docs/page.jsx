import { DocsPage } from "@/components/site/docs-page";
import { JsonLd } from "@/components/site/json-ld";
import { docsJsonLd, docsMetadata } from "@/lib/docs-meta";

export const metadata = docsMetadata("");

export default function Documentation() {
  return (
    <>
      <JsonLd nodes={docsJsonLd("")} />
      <DocsPage slug="" />
    </>
  );
}
