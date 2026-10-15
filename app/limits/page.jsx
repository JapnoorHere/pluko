import Link from "next/link";
import InfoPage from "@/components/marketing/info-page";
import { LIMITS } from "@/limits.mjs";

export const metadata = {
  title: "Limits — Pluko",
  description:
    "Request rates, daily usage, sizes, and how long Pluko keeps your data. What to expect before you integrate.",
};

const sections = [
  ["rates", "Rates and sizes"],
  ["usage", "Daily usage"],
  ["retention", "How long data is kept"],
  ["no-guarantee", "What is not guaranteed"],
  ["pricing", "Pricing"],
];

const rates = [
  ["API requests per key", `${LIMITS.keyPerMinute} per minute`],
  ["API requests per account (all keys together)", `${LIMITS.accountPerMinute} per minute`],
  ["Active jobs per project", `${LIMITS.activeJobsPerProject} queued or running`],
  ["Request body", `${LIMITS.requestBodyBytes / 1024} KiB; split larger batches into several jobs`],
  ["Results per page", `up to ${LIMITS.resultsPageMax}`],
  ["Query length", `${LIMITS.queryMaxLength} characters`],
  ["API key lifetime", `${LIMITS.keyDaysDefault} days by default, up to ${LIMITS.keyDaysMax}`],
  ["Dashboard session", `${LIMITS.sessionHours} hours`],
  ["Images per search", "No product cap. The source can still run out of distinct results."],
];

const keptFor = [
  ["Search jobs and their result metadata", "30 days after the job finishes"],
  ["Full request and response bodies in logs", "30 days"],
  ["Request summaries, provider attempts, feedback, webhook delivery records", "90 days"],
  ["Audit history", "365 days"],
  ["Daily usage counts", "365 days"],
];

export default function Limits() {
  return (
    <InfoPage
      eyebrow="PLUKO / LIMITS"
      title="Limits and what to expect"
      introduction="The numbers below are what the service enforces today. Pluko is in beta, so they may change; material changes will be reflected on this page and in the API documentation."
      sections={sections}
    >
      <section id="rates">
        <h2>Rates and sizes</h2>
        <table className="w-full text-left text-sm [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_th]:pb-2 [&_th]:pr-4">
          <thead>
            <tr>
              <th>Limit</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(([name, value]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          When you exceed a rate or queue limit the API answers{" "}
          <code>429</code> with a <code>Retry-After</code> header. Back off and
          retry.
        </p>
      </section>
      <section id="usage">
        <h2>Daily usage</h2>
        <p>
          Each project has a daily limit counted in <strong>provider pages</strong>
          , not images. A provider page is one request to the image source and
          returns up to {LIMITS.imagesPerPage} images. New projects start with{" "}
          {LIMITS.defaultDailyPages} pages a day, which is at most about{" "}
          {(LIMITS.defaultDailyPages * LIMITS.imagesPerPage).toLocaleString()}{" "}
          images, fewer once filters and duplicates remove candidates.
        </p>
        <p>
          When a project reaches its limit, running searches finish{" "}
          <code>partial</code> with the reason <code>daily_page_quota</code>.
          Usage resets at 00:00 UTC. See your usage in the workspace overview or
          with <code>GET /v1/usage</code>.
        </p>
      </section>
      <section id="retention">
        <h2>How long data is kept</h2>
        <p>
          These are the default retention periods. The operator can change them,
          so treat them as the standard behaviour rather than a contract.
          Export results you need to keep before they expire.
        </p>
        <table className="w-full text-left text-sm [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_th]:pb-2 [&_th]:pr-4">
          <thead>
            <tr>
              <th>Data</th>
              <th>Kept</th>
            </tr>
          </thead>
          <tbody>
            {keptFor.map(([name, value]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Accounts, projects, and keys are kept until you delete them. You can
          download your data or delete your account from the Account page. Pluko
          never stores image files, only links and metadata. More detail is in
          the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
      <section id="no-guarantee">
        <h2>What is not guaranteed</h2>
        <ul>
          <li>
            <strong>A full result count.</strong> The source, duplicates, filters,
            or your daily limit can end a search early. The job says why.
          </li>
          <li>
            <strong>Exact filter matching.</strong> Filters are passed to the
            image source on a best-effort basis.
          </li>
          <li>
            <strong>Watermark-free images.</strong> Watermark handling is a hint
            based on titles and domains. Pluko never removes watermarks.
          </li>
          <li>
            <strong>Reuse rights.</strong> Results carry no licence. Check each
            source before using an image.
          </li>
          <li>
            <strong>Uptime.</strong> This is a beta service with no uptime
            commitment. Current status is on the{" "}
            <Link href="/status">status page</Link>.
          </li>
        </ul>
      </section>
      <section id="pricing">
        <h2>Pricing</h2>
        <p>
          Pricing and plans have not been announced. The limits above apply to
          every account during the beta. If that changes, this page and the
          documentation will say so before it takes effect.
        </p>
        <p>
          Questions or need higher limits? See the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
