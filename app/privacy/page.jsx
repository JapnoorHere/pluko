import LegalPage, { LegalContact } from "@/components/marketing/legal-page";

export const metadata = {
  title: "Privacy Policy — Pluko",
  description:
    "How pStack handles Pluko account information, search metadata, request logs, cookies, and privacy requests.",
};
const sections = [
  {
    id: "operator",
    title: "Who operates Pluko",
    content: (
      <>
        <p>
          This policy explains how pStack handles information when you use its
          Pluko website, workspace, and image-search API. If someone else hosts
          a separate copy of Pluko, ask that operator about its own data
          practices.
        </p>
        <LegalContact />
      </>
    ),
  },
  {
    id: "data",
    title: "Information we store",
    content: (
      <>
        <ul>
          <li>
            <strong>Account information:</strong> email address, role, account
            status, creation date, and a salted password hash.
          </li>
          <li>
            <strong>Access information:</strong> hashed session tokens, session
            expiry, CSRF values, a short device description for each session
            (browser and operating system), API-key hashes and prefixes,
            scopes, expiry, and last-use information. Enabled authenticator
            secrets are encrypted.
          </li>
          <li>
            <strong>Webhook settings:</strong> if you set a webhook, its URL, an
            encrypted signing secret, and a record of each delivery attempt
            (event type, time, response status, and error text).
          </li>
          <li>
            <strong>Search data:</strong> queries, filters, requested counts,
            job progress, image URLs, source URLs, titles, dimensions, and other
            result metadata.
          </li>
          <li>
            <strong>Operational records:</strong> sanitized request and response
            bodies, routes, status codes, timing, provider attempts, usage
            counts, audit events, and feedback you submit.
          </li>
        </ul>
        <p>
          The image-search service does not download or store image files. Your
          browser or application may load images directly from their hosts.
          Avoid putting personal, confidential, or sensitive information into
          queries and feedback.
        </p>
        <p>
          Credential fields are redacted before request logging. Redaction is
          not a guarantee that arbitrary personal information inside a query or
          free-text field will be removed. Connection IP addresses are used for
          rate limiting; hosting and proxy systems may also generate their own
          access logs.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Why we use this information",
    content: (
      <>
        <p>
          We use this information to authenticate accounts, run searches, return
          results, enforce quotas, investigate failures and misuse, maintain the
          service, and respond to support requests.
        </p>
        <p>
          Account owners can inspect their workspace data. Service
          administrators can access account records, search metadata, sanitized
          request logs, and audit records through operational tools. Do not
          treat a search query as a private message to the service.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Search providers and image hosts",
    content: (
      <>
        <p>
          Search queries are sent to the image-search provider the service is
          configured to use, currently Bing, to retrieve results. That provider
          processes those requests under its own terms and privacy practices.
          Pluko does not send your password or API key to the search provider.
        </p>
        <p>
          If you set a webhook, Pluko sends signed event notifications (job
          identifiers, status, and counts) to the address you provide. That
          server is yours or your provider’s, and its own policies apply.
        </p>
        <p>
          The landing page loads sample photography from Unsplash. Search-result
          previews and full-image links can load content from other websites.
          Those hosts receive normal connection information, such as your IP
          address and browser details, and their own policies apply. Hosting
          providers may process data to operate the service. Depending on those
          providers, processing may occur outside your country.
        </p>
        <p>
          The current application does not include advertising trackers or
          third-party analytics scripts.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and session controls",
    content: (
      <>
        <p>
          Pluko uses a session cookie to keep you signed in. Sessions normally
          expire after 12 hours; logging out invalidates the current session.
          The workspace can also store a sidebar preference cookie for up to
          seven days.
        </p>
        <p>
          These cookies support login and interface preferences. You can remove
          them in your browser, which may sign you out or reset preferences.
          Blocking the session cookie prevents authenticated workspace use.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long information remains",
    content: (
      <>
        <p>The current default retention settings are:</p>
        <ul>
          <li>Sanitized request and response bodies: 30 days.</li>
          <li>
            Request summaries, provider attempts, feedback, and finished webhook
            delivery records: 90 days.
          </li>
          <li>Inactive jobs and their result metadata: 30 days.</li>
          <li>Audit history and usage summaries: approximately one year.</li>
        </ul>
        <p>
          Administrators can change configurable retention periods. Cleanup runs
          periodically while the worker is running, rather than at an exact
          deletion deadline. Active jobs are not removed by the inactive-job
          cleanup.
        </p>
        <p>
          Account, project, and key records do not have an automatic deletion
          schedule. Backups can retain earlier copies until separately removed.
          Contact us for the settings that apply to your deployment or for a
          deletion request; we will explain any records that must remain for
          security, legal, or operational reasons.
        </p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices and requests",
    content: (
      <>
        <p>
          You can change your password, sign out other devices, revoke or rotate
          API keys, download your data, and stop using the service from the
          Account page of your workspace. For correction or other privacy
          requests, contact pStack using the details below. We may need to
          verify that you own the account before releasing or changing
          information.
        </p>
        <p>
          You can delete your account yourself from the Account page. This
          permanently removes your projects, API keys, search jobs and results,
          feedback, and request logs. Audit history is kept without naming your
          account, and backups can retain earlier copies until they are
          separately removed. Rights and available remedies depend on applicable
          law. This policy does not limit those rights.
        </p>
        <LegalContact />
      </>
    ),
  },
  {
    id: "updates",
    title: "Security and policy changes",
    content: (
      <>
        <p>
          We use controls such as password hashing, access checks, session
          expiry, credential redaction, and encrypted authenticator secrets. No
          system can guarantee complete security. Report suspected unauthorized
          access promptly and revoke any affected keys.
        </p>
        <p>
          We will update this page when our practices change and revise the date
          above. Material changes should be reviewed before you continue sending
          information to Pluko; additional notice or consent will be provided
          where required by applicable law.
        </p>
      </>
    ),
  },
];
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      introduction="What Pluko stores, how it is used, and how to contact us about your information."
      sections={sections}
    />
  );
}
