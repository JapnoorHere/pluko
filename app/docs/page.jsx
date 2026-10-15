import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/marketing/site-header";
import { CodePlayground } from "@/components/marketing/code-playground";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing.module.css";
import { LIMITS } from "@/limits.mjs";
import { FILTER_VALUES } from "@/filters.mjs";
import { SAMPLE_EVENT, VERIFY_SNIPPET } from "@/lib/webhook-example";

export const metadata = {
  title: "API documentation — Pluko",
  description:
    "Integrate Pluko image search: authentication, asynchronous jobs, batch queries, result pagination, and error handling.",
};
const sections = [
  ["quickstart", "Quick start"],
  ["authentication", "Authentication"],
  ["requests", "Requests & responses"],
  ["batches", "Batch searches"],
  ["filters", "Filters"],
  ["pagination", "Jobs & pagination"],
  ["webhooks", "Webhooks"],
  ["errors", "Limits & errors"],
  ["quality", "Image metadata"],
  ["actions", "Cancel, retry & feedback"],
  ["tools", "Usage, status & OpenAPI"],
];

export default function Documentation() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main className={styles.docsLayout}>
        <nav className={styles.docsNav} aria-label="Documentation sections">
          <strong>API DOCUMENTATION</strong>
          {sections.map(([id, title]) => (
            <a key={id} href={`#${id}`}>
              {title}
            </a>
          ))}
        </nav>
        <div className={styles.docsMain}>
          <span className={styles.eyebrow}>PLUKO / DEVELOPERS</span>
          <h1>Your first image search.</h1>
          <p>
            Use HTTP from your backend to create a search job, follow its
            progress, and retrieve image URLs. No SDK is required.
          </p>
          <Button asChild>
            <Link href="/app">
              Open workspace
              <ArrowUpRight />
            </Link>
          </Button>
          <section id="quickstart">
            <h2>Quick start</h2>
            <p>
              Create a project in your workspace, then generate an API key with{" "}
              <code>search</code> and <code>read</code> scopes. Copy it when
              shown; the full key is displayed once.
            </p>
            <p>
              Set these environment variables on your backend. Use your
              deployment’s origin when hosted.
            </p>
            <pre>
              {"PLUKO_URL=http://127.0.0.1:4180\nPLUKO_API_KEY=YOUR_API_KEY"}
            </pre>
            <p>
              Submit a query, take the returned <code>job_id</code>, and use it
              in the status and results endpoints. A <code>202</code> response
              means the job was accepted, not that images are ready.
            </p>
          </section>
          <section id="authentication">
            <h2>Authentication</h2>
            <p>
              Send <code>Authorization: Bearer YOUR_API_KEY</code> on every
              public API request. Keep keys on your server, never in browser
              code, mobile applications, URLs, or logs.
            </p>
            <ul>
              <li>
                <code>search</code>: create, cancel, and retry jobs.
              </li>
              <li>
                <code>read</code>: retrieve job state and results.
              </li>
              <li>Keys can expire or be revoked from the workspace.</li>
            </ul>
          </section>
          <section id="requests">
            <h2>Requests & responses</h2>
            <p>
              Examples use standard HTTP clients. Replace <code>JOB_ID</code>{" "}
              with the ID returned by your search. Response excerpts are
              illustrative; real responses contain additional metadata.
            </p>
            <CodePlayground />
            <p>
              Send <code>count</code> as a positive decimal string. Optional
              settings include <code>min_width</code>,{" "}
              <code>exclude_domains</code>, and <code>watermark_policy</code> (
              <code>prefer_clean</code> or <code>any</code>); see{" "}
              <a href="#filters">Filters</a> for the rest.
            </p>
            <p>
              Add a unique <code>Idempotency-Key</code> header when submitting a
              job. Retrying with that key and identical input returns the
              original job. Reusing it with different input returns{" "}
              <code>409 IDEMPOTENCY_CONFLICT</code>.
            </p>
          </section>
          <section id="batches">
            <h2>Batch searches</h2>
            <p>
              Submit multiple unique queries in one job. Each query has its own
              requested count.
            </p>
            <pre>
              {JSON.stringify(
                {
                  queries: [
                    { query: "mountain landscape", count: "15" },
                    { query: "wireless headphones", count: "30" },
                  ],
                  min_width: 800,
                  watermark_policy: "prefer_clean",
                },
                null,
                2,
              )}
            </pre>
            <p>
              JSON request bodies are limited to 64 KiB. Split large batches
              across jobs. There is no arbitrary image-count cap, but provider
              availability and project quotas still apply.
            </p>
          </section>
          <section id="filters">
            <h2>Filters</h2>
            <p>
              Narrow a search with optional fields next to{" "}
              <code>query</code>. Omit a field, or send <code>any</code>, to
              leave it unfiltered. Filters are passed to the image source on a
              best-effort basis, so some results may not match exactly.
            </p>
            <ul>
              {Object.entries(FILTER_VALUES).map(([name, values]) => (
                <li key={name}>
                  <code>{name}</code>:{" "}
                  {values.map((value, index) => (
                    <span key={value}>
                      {index > 0 && ", "}
                      <code>{value}</code>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p>
              <code>safe_search</code> defaults to <code>moderate</code> and
              cannot be switched off. An invalid value returns{" "}
              <code>400 INVALID_FILTER</code>.
            </p>
            <pre>
              {JSON.stringify(
                {
                  query: "city skyline",
                  count: "20",
                  image_type: "photo",
                  layout: "wide",
                  size: "large",
                  safe_search: "strict",
                },
                null,
                2,
              )}
            </pre>
          </section>
          <section id="pagination">
            <h2>Jobs & pagination</h2>
            <p>
              Poll <code>GET /v1/jobs/JOB_ID</code> with backoff. Jobs can be{" "}
              <code>queued</code>, <code>running</code>, <code>complete</code>,{" "}
              <code>partial</code>, or <code>cancelled</code>. For partial jobs,
              inspect each query’s <code>reason</code>.
            </p>
            <p>
              Read <code>GET /v1/jobs/JOB_ID/results?limit=100&after=0</code>. A
              page contains up to 100 images. Pass <code>next_cursor</code> as{" "}
              <code>after</code> to read the next page.
            </p>
            <p>
              When <code>next_cursor</code> is null, you have reached the end of
              the currently available results. If the job is still running, wait
              and continue from <code>poll_after</code> to retrieve new results
              without reading earlier rows again.
            </p>
          </section>
          <section id="webhooks">
            <h2>Webhooks</h2>
            <p>
              Skip polling: add a webhook to a project (Projects, then Webhook)
              and Pluko sends a signed <code>POST</code> to your https endpoint
              when a job becomes <code>complete</code>, <code>partial</code> or{" "}
              <code>cancelled</code>. Fetch the results with the usual results
              endpoint using the <code>job_id</code> in the event.
            </p>
            <pre>{JSON.stringify(SAMPLE_EVENT, null, 2)}</pre>
            <p>
              Each request carries <code>Pluko-Event</code>,{" "}
              <code>Pluko-Delivery</code> (unique per event; use it to ignore
              duplicates), and <code>Pluko-Signature</code> in the form{" "}
              <code>t=&lt;ms&gt;,v1=&lt;hex&gt;</code>. <code>v1</code> is the
              HMAC-SHA256 of <code>&quot;&lt;t&gt;.&lt;raw body&gt;&quot;</code>{" "}
              using your signing secret, which is shown once when you save the
              webhook. Verify it, and reject timestamps more than five minutes
              old.
            </p>
            <pre>{VERIFY_SNIPPET}</pre>
            <ul>
              <li>Answer with any <code>2xx</code> status within 8 seconds.</li>
              <li>
                Failed deliveries are retried up to 5 times, after about 30
                seconds, 2 minutes, 10 minutes, 1 hour and 6 hours. You can
                retry a failed one from the dashboard.
              </li>
              <li>
                Endpoints must use https on port 443 with a public domain name.
                Private and internal addresses are refused.
              </li>
              <li>
                Delivery is at least once and not strictly ordered. Treat the
                job status as the source of truth.
              </li>
            </ul>
          </section>
          <section id="errors">
            <h2>Limits & errors</h2>
            <p>
              Public API traffic is limited to {LIMITS.keyPerMinute} requests
              per minute per key and {LIMITS.accountPerMinute} per minute across
              an account’s keys. At most {LIMITS.activeJobsPerProject} jobs per
              project can be queued or running. Project provider-page quotas
              apply separately; see <code>GET /v1/usage</code>. Respect the{" "}
              <code>Retry-After</code> header on <code>429</code> responses. All
              limits are listed on the <Link href="/limits">limits page</Link>.
            </p>
            <pre>
              {JSON.stringify(
                {
                  error: {
                    code: "UNAUTHORIZED",
                    message: "Provide a Bearer API key",
                  },
                  request_id: "req_example",
                },
                null,
                2,
              )}
            </pre>
            <ul>
              <li>
                <code>401</code>: missing, expired, or revoked key.
              </li>
              <li>
                <code>403</code>: missing scope or unavailable account access.
              </li>
              <li>
                <code>400</code>: invalid query, count, or input.
              </li>
              <li>
                <code>409</code>: an idempotency key was reused with different
                input.
              </li>
              <li>
                <code>413</code>: request body exceeds 64 KiB.
              </li>
              <li>
                <code>429</code>: rate or queue limit; back off before retrying.
              </li>
            </ul>
            <p>
              Keep <code>request_id</code> and <code>job_id</code> when
              investigating failures. Do not include credentials in support
              reports.
            </p>
          </section>
          <section id="quality">
            <h2>Image metadata & reuse</h2>
            <p>
              Results include <code>image_url</code>, available{" "}
              <code>thumbnail_url</code>, <code>source_url</code>, title,
              domain, and dimensions. Dimensions are provider metadata and are
              not verified by downloading images.
            </p>
            <p>
              Watermark filtering is a source/title heuristic, not a guarantee.
              Pluko does not remove watermarks. Source URLs can expire or block
              embedding, so handle image-load failures in your application.
            </p>
            <p>
              Search results grant no reuse rights. Review the original source
              and licensing terms. Pluko stores metadata and logs, not image
              files.
            </p>
          </section>
          <section id="actions">
            <h2>Cancel, retry & feedback</h2>
            <p>
              Use <code>POST /v1/jobs/JOB_ID/cancel</code> to stop a queued or
              running job; a job that already finished returns{" "}
              <code>409 JOB_FINISHED</code> and keeps its status.{" "}
              <code>POST /v1/jobs/JOB_ID/retry</code> creates a new job from its
              payload. Both require the search scope.
            </p>
            <p>
              Report a result with <code>POST /v1/feedback</code>. Supported
              reasons are <code>not_relevant</code>, <code>watermark</code>,{" "}
              <code>broken</code>, and <code>other</code>.
            </p>
            <pre>
              {JSON.stringify(
                {
                  job_id: "JOB_ID",
                  result_id: "IMAGE_ID",
                  reason: "not_relevant",
                  note: "The result does not match the query.",
                },
                null,
                2,
              )}
            </pre>
          </section>
          <section id="tools">
            <h2>Usage, status & OpenAPI</h2>
            <ul>
              <li>
                <code>GET /v1/usage</code> (read scope) returns today’s provider
                pages used, your daily limit, pages remaining, when it resets
                (00:00 UTC), and the last week. A page is one request to the
                image source and returns up to {LIMITS.imagesPerPage} images.
              </li>
              <li>
                <code>GET /v1/jobs</code> (read scope) lists your project’s jobs,
                newest first. Filter with <code>status</code> and page with{" "}
                <code>before=&lt;next_cursor&gt;</code>.
              </li>
              <li>
                <code>GET /v1/status</code> needs no key and reports whether the
                API, worker and image source are working. Also shown on the{" "}
                <Link href="/status">status page</Link>.
              </li>
              <li>
                <a href="/v1/openapi.json">
                  <code>GET /v1/openapi.json</code>
                </a>{" "}
                is the OpenAPI 3.1 description. Import it into Postman,
                Insomnia, or a code generator.
              </li>
            </ul>
            <p>
              Results are removed after the retention period shown on each job
              (<code>expires</code>), 30 days after it finishes by default.
              Export what you need before then.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
