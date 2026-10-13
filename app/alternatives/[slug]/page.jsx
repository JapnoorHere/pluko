import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleLayout, ArticleSection, Callout, CodeBlock, PageHero, Prose, PublicShell, SimpleTable } from "@/components/site/ui";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbs, faqPage, techArticle } from "@/lib/jsonld";
import { ALTERNATIVE_SLUGS, alternatives } from "@/lib/marketing/alternatives";
import { docHref } from "@/lib/docs-pages";
import { pageMetadata } from "@/lib/site-meta";

export const dynamicParams = false;
export function generateStaticParams() {
  return ALTERNATIVE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const page = alternatives[(await params).slug];
  if (!page) return {};
  return pageMetadata(`/alternatives/${(await params).slug}`, { title: page.title, description: page.description });
}

const contents = [
  ["what-changed", "What changed"],
  ["migrate", "Move a request"],
  ["fields", "Field mapping"],
  ["differences", "What works differently"],
  ["faq", "Questions"],
];

const formatDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function AlternativePage({ params }) {
  const { slug } = await params;
  const page = alternatives[slug];
  if (!page) notFound();
  const path = `/alternatives/${slug}`;
  return (
    <PublicShell>
      <JsonLd nodes={[breadcrumbs([["Pluko", "/"], [`${page.name} alternative`, path]]), techArticle({ path, title: page.title, description: page.description, updated: page.updated }), faqPage(page.faqs)]} />
      <PageHero eyebrow={`${page.name} alternative`} title={page.heading} actions={<>
        <Button asChild size="lg" className="h-11 rounded-full px-6"><Link href="/app?mode=register">Get an API key<ArrowRight /></Link></Button>
        <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-5"><Link href="/docs#quickstart">Read the quick start</Link></Button>
      </>}>
        {page.answer}
      </PageHero>

      <ArticleLayout contents={contents}>
        <p className="mb-10 text-sm text-muted-foreground">Last updated {formatDate(page.updated)}</p>

        <ArticleSection id="what-changed" title="What changed">
          <SimpleTable columns={["Topic", "Details"]} rows={page.facts} />
        </ArticleSection>

        <ArticleSection id="migrate" title="Move a request to Pluko">
          <Prose><p>Before, with the {page.name}:</p></Prose>
          <CodeBlock title="Before" code={page.oldRequest} />
          <Prose><p>After, with Pluko. <code>Prefer: wait=5</code> waits up to five seconds and returns the first page of images in the same response; larger searches carry on as a background job you can read with <code>GET /v1/jobs/JOB_ID/results</code>.</p></Prose>
          <CodeBlock title="After" code={page.plukoRequest} />
          <Callout type="tip">Keep your API key on your server. Create one in the <Link href="/app?mode=register">workspace</Link> with the <code>search</code> and <code>read</code> scopes.</Callout>
        </ArticleSection>

        <ArticleSection id="fields" title="Field mapping">
          <SimpleTable columns={[page.name, "Pluko"]} rows={page.fieldMap.map(([from, to]) => [<code key="from">{from}</code>, to])} />
          <Prose><p>Every field is described in the <Link href={docHref("metadata")}>documentation</Link> and the <a href="/v1/openapi.json">OpenAPI schema</a>.</p></Prose>
        </ArticleSection>

        <ArticleSection id="differences" title="What works differently">
          <SimpleTable columns={["Pluko", "How it works"]} rows={page.differences} />
          <Callout type="note">Search results do not grant reuse rights. Pluko returns where each image lives; check the source and its license before you reuse an image.</Callout>
        </ArticleSection>

        <ArticleSection id="faq" title="Questions">
          <div className="grid gap-6">
            {page.faqs.map(([question, answer]) => (
              <div key={question}>
                <h3 className="font-semibold tracking-tight">{question}</h3>
                <p className="mt-2 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
          <Prose><p>Need higher limits or help moving? <Link href="/contact">Get in touch</Link>. Current limits are on the <Link href="/limits">limits page</Link>.</p></Prose>
        </ArticleSection>
      </ArticleLayout>
    </PublicShell>
  );
}
