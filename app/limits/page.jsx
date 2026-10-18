import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LIMITS } from "@/limits.mjs";
import { ArticleLayout, ArticleSection, Callout, PageHero, Prose, PublicShell, Reveal, SimpleTable } from "@/components/site/ui";
import { pageMetadata } from "@/lib/site-meta";

export const metadata = pageMetadata("/limits", {
  title: "Limits — Pluko",
  description:
    "Request rates, daily usage, sizes, and how long Pluko keeps your data. What to expect before you integrate.",
});

const contents = [
  ["rates", "Rates and sizes"],
  ["usage", "Daily usage"],
  ["retention", "How long data is kept"],
  ["no-guarantee", "What isn’t guaranteed"],
  ["pricing", "Pricing"],
];

const tiles = [
  [LIMITS.keyPerMinute, "requests a minute", "per API key"],
  [LIMITS.accountPerMinute, "requests a minute", "per account, all keys together"],
  [LIMITS.activeJobsPerProject, "active jobs", "queued or running, per project"],
  [LIMITS.resultsPageMax, "results per page", "when reading a job’s results"],
  [LIMITS.imagesPerPage, "images per provider page", "the unit daily usage is counted in"],
  [LIMITS.defaultDailyPages, "provider pages a day", "for a new project"],
];

const rates = [
  ["API requests per key", `${LIMITS.keyPerMinute} per minute`],
  ["API requests per account (all keys together)", `${LIMITS.accountPerMinute} per minute`],
  ["Active jobs per project", `${LIMITS.activeJobsPerProject} queued or running`],
  ["Request body", `${LIMITS.requestBodyBytes / 1024} KiB; split larger batches into several jobs`],
  ["Results per page", `Up to ${LIMITS.resultsPageMax}`],
  ["Query length", `${LIMITS.queryMaxLength} characters`],
  ["API key lifetime", `${LIMITS.keyDaysDefault} days by default, up to ${LIMITS.keyDaysMax}`],
  ["Dashboard session", `${LIMITS.sessionHours} hours`],
  ["Images per search", "No product cap. The source can still run out of distinct results."],
];

const retention = [
  ["Full request and response bodies in logs", 30],
  ["Search jobs and their result metadata", 30, "after the job finishes"],
  ["Request summaries, provider attempts, feedback, webhook delivery records", 90],
  ["Audit history", 365],
  ["Daily usage counts", 365],
];

const notGuaranteed = [
  ["A full result count", "The source, duplicates, filters or your daily limit can end a search early. The job says why."],
  ["Exact filter matching", "Filters are passed to the image source on a best-effort basis."],
  ["Watermark-free images", "Watermark handling is a hint based on titles and domains. Pluko never removes watermarks."],
  ["Reuse rights", "Results carry no licence. Check each source before using an image."],
  ["Uptime", "This is a beta service with no uptime commitment. Current state is on the status page."],
];

export default function Limits() {
  const maxImages = (LIMITS.defaultDailyPages * LIMITS.imagesPerPage).toLocaleString("en");
  return (
    <PublicShell>
      <PageHero eyebrow="Limits" title="Limits, in plain numbers.">
        What the service enforces today. Pluko is in beta, so these may change; material changes will be reflected here and in the documentation.
      </PageHero>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(([value, label, hint], index) => (
            <Reveal key={label + hint} delay={index * 50} className="bg-background p-8">
              <p className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">{Number(value).toLocaleString("en")}</p>
              <p className="mt-3 font-medium">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <ArticleLayout contents={contents}>
        <ArticleSection id="rates" title="Rates and sizes">
          <SimpleTable columns={["Limit", "Value"]} rows={rates} />
          <Prose>
            <p>When you go over a rate or queue limit, the API answers <code>429</code> with a <code>Retry-After</code> header. Back off and retry.</p>
          </Prose>
        </ArticleSection>

        <ArticleSection id="usage" title="Daily usage">
          <div className="grid items-center gap-3 rounded-3xl border bg-muted/30 p-6 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div><p className="text-3xl font-semibold tracking-tight">1 page</p><p className="mt-1 text-sm text-muted-foreground">one request to the source</p></div>
            <ArrowRight className="mx-auto size-5 rotate-90 text-muted-foreground sm:rotate-0" />
            <div><p className="text-3xl font-semibold tracking-tight">≤ {LIMITS.imagesPerPage}</p><p className="mt-1 text-sm text-muted-foreground">images back</p></div>
            <ArrowRight className="mx-auto size-5 rotate-90 text-muted-foreground sm:rotate-0" />
            <div><p className="text-3xl font-semibold tracking-tight">≈ {maxImages}</p><p className="mt-1 text-sm text-muted-foreground">images a day at most, for {LIMITS.defaultDailyPages} pages</p></div>
          </div>
          <Prose>
            <p>Each project has a daily limit counted in <strong>provider pages</strong>, not images. New projects start with {LIMITS.defaultDailyPages} pages a day: at most about {maxImages} images, fewer once filters and duplicates remove candidates.</p>
            <p>When a project reaches its limit, running searches finish <code>partial</code> with the reason <code>daily_page_quota</code>. Usage resets at 00:00 UTC. See it in the workspace overview or with <code>GET /v1/usage</code>.</p>
          </Prose>
        </ArticleSection>

        <ArticleSection id="retention" title="How long data is kept">
          <Prose>
            <p>These are the default retention periods. The operator can change them, so treat them as the standard behaviour rather than a contract. Export results you need before they expire.</p>
          </Prose>
          <ul className="grid gap-4 rounded-3xl border p-6">
            {retention.map(([label, days, note]) => (
              <li key={label} className="grid gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-medium">{label}</span><span className="text-muted-foreground tabular-nums">{days} days{note ? ` ${note}` : ""}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--accent-ink)]" style={{ width: `${(days / 365) * 100}%`, opacity: 0.4 + (days / 365) * 0.6 }} /></div>
              </li>
            ))}
          </ul>
          <Prose>
            <p>Accounts, projects and keys are kept until you delete them. You can download your data or delete your account from the Account page. Pluko never stores image files, only links and metadata. More detail is in the <Link href="/privacy">Privacy Policy</Link>.</p>
          </Prose>
        </ArticleSection>

        <ArticleSection id="no-guarantee" title="What isn’t guaranteed">
          <ul className="divide-y rounded-3xl border">
            {notGuaranteed.map(([title, text]) => (
              <li key={title} className="p-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                  {title === "Uptime" ? <>This is a beta service with no uptime commitment. Current state is on the <Link className="text-[var(--accent-ink)] underline underline-offset-2" href="/status">status page</Link>.</> : text}
                </p>
              </li>
            ))}
          </ul>
        </ArticleSection>

        <ArticleSection id="pricing" title="Pricing">
          <Callout type="note" title="Not announced yet">
            Pricing and plans haven’t been announced. The limits above apply to every account during the beta. If that changes, this page and the documentation will say so before it takes effect. Need higher limits? <Link href="/contact">Get in touch</Link>.
          </Callout>
        </ArticleSection>
      </ArticleLayout>
    </PublicShell>
  );
}
