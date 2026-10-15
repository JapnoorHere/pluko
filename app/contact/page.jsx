import Link from "next/link";
import InfoPage from "@/components/marketing/info-page";
import { legal } from "@/lib/legal";

export const metadata = {
  title: "Contact — Pluko",
  description:
    "How to reach the Pluko team for support, limits, privacy requests, or to report misuse or a security problem.",
};

const sections = [
  ["email", "Email us"],
  ["include", "What to include"],
  ["security", "Security and misuse"],
  ["self-service", "Things you can do yourself"],
];

export default function Contact() {
  return (
    <InfoPage
      eyebrow="PLUKO / CONTACT"
      title="Contact"
      introduction="Pluko is built and run by a small team. Email is the best way to reach us."
      sections={sections}
    >
      <section id="email">
        <h2>Email us</h2>
        <p>
          <a href={`mailto:${legal.email}`}>{legal.email}</a> for support,
          higher limits, privacy requests, or feedback. We reply as soon as we
          can but do not offer a guaranteed response time during the beta.
        </p>
        <p>
          Pluko is operated by <a href={legal.website}>{legal.operator}</a>.
        </p>
      </section>
      <section id="include">
        <h2>What to include</h2>
        <ul>
          <li>The email address of your Pluko account.</li>
          <li>
            The <code>request_id</code> from the API response and the{" "}
            <code>job_id</code> if a search is involved. Every response has a{" "}
            <code>request_id</code>.
          </li>
          <li>What you expected, what happened, and when (with your time zone).</li>
        </ul>
        <p>
          <strong>Never send</strong> passwords, API keys, webhook secrets, or
          authenticator codes. If a key may have leaked, revoke or rotate it from
          the API keys page first.
        </p>
      </section>
      <section id="security">
        <h2>Security and misuse</h2>
        <p>
          To report a vulnerability or abuse, email the address above with the
          subject line “Security” or “Abuse”. Please give us a reasonable chance
          to fix a problem before sharing it publicly, and do not access other
          people’s data while testing.
        </p>
      </section>
      <section id="self-service">
        <h2>Things you can do yourself</h2>
        <ul>
          <li>
            Check whether the service is up on the{" "}
            <Link href="/status">status page</Link>.
          </li>
          <li>
            See current rates, daily usage, and retention on the{" "}
            <Link href="/limits">limits page</Link>.
          </li>
          <li>
            Find endpoints, error codes, and webhooks in the{" "}
            <Link href="/docs">API documentation</Link>, or fetch the machine
            readable description at <code>/v1/openapi.json</code>.
          </li>
          <li>
            Download or delete your data, sign out other devices, and rotate keys
            from the Account and API keys pages in your workspace.
          </li>
        </ul>
      </section>
    </InfoPage>
  );
}
