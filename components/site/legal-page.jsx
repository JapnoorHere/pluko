import Link from "next/link";
import { Check } from "lucide-react";
import { legal } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { ArticleLayout, ArticleSection, PageHero, PrintButton, Prose, PublicShell, Reveal } from "./ui";

export function LegalContact() {
  return (
    <p>
      Pluko is operated by <a href={legal.website}>{legal.operator}</a>. For
      privacy requests, account assistance, or reports about misuse, email{" "}
      <a href={`mailto:${legal.email}`}>{legal.email}</a>. Website:{" "}
      <a href={legal.website}>pStack.in</a>. Include your account email and
      relevant request or job IDs, but never send passwords, API keys, or
      authenticator codes.
    </p>
  );
}

const DOCUMENTS = [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"]];

// Legal documents: the full text is unchanged; the summary is a plain-language guide, not a replacement.
export default function LegalPage({ path, title, introduction, summary, sections }) {
  return (
    <PublicShell>
      <PageHero eyebrow={`Last updated ${legal.updated}`} title={title}>{introduction}</PageHero>
      <section className="px-5 pb-20 sm:px-8">
        <Reveal className="mx-auto max-w-[1000px] rounded-3xl border bg-muted/40 p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">The short version</h2>
            <PrintButton />
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {summary.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><Check className="size-3" /></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">This summary is a guide only. The full text below is what applies.</p>
        </Reveal>
      </section>
      <ArticleLayout
        contents={sections.map((section) => [section.id, section.title])}
        aside={
          <nav aria-label="Legal documents" className="grid gap-1 border-t pt-6 text-sm">
            {DOCUMENTS.map(([href, label]) => (
              <Link key={href} href={href} aria-current={href === path ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 transition-colors", href === path ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>{label}</Link>
            ))}
          </nav>
        }
      >
        {sections.map((section, index) => (
          <ArticleSection key={section.id} id={section.id} title={<><span className="mr-3 font-mono text-base font-normal text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>{section.title}</>}>
            <Prose>{section.content}</Prose>
          </ArticleSection>
        ))}
      </ArticleLayout>
    </PublicShell>
  );
}
