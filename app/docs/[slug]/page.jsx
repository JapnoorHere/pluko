import { notFound } from "next/navigation";
import { DocsPage } from "@/components/site/docs-page";
import { JsonLd } from "@/components/site/json-ld";
import { DOCS_PAGES, docsPage } from "@/lib/docs-pages";
import { docsJsonLd, docsMetadata } from "@/lib/docs-meta";

export const dynamicParams = false;
export function generateStaticParams() {
  return DOCS_PAGES.filter((page) => page.slug).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return docsPage(slug) ? docsMetadata(slug) : {};
}

export default async function DocumentationPage({ params }) {
  const { slug } = await params;
  if (!docsPage(slug)) notFound();
  return (
    <>
      <JsonLd nodes={docsJsonLd(slug)} />
      <DocsPage slug={slug} />
    </>
  );
}
