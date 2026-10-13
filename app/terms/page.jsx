import Link from "next/link";
import LegalPage, { LegalContact } from "@/components/marketing/legal-page";

export const metadata = {
  title: "Terms of Service — Pluko",
  description:
    "Service rules for Pluko accounts, API access, image rights, acceptable use, and beta availability.",
};
const sections = [
  {
    id: "service",
    title: "Using Pluko",
    content: (
      <>
        <p>
          These terms describe use of Pluko, an image-search service operated by
          pStack. By using the service, you agree to these terms. If you use it
          for an organization, you must have authority to act for that
          organization. You must be legally able to enter into this agreement.
        </p>
        <p>
          Pluko returns image URLs and metadata, with a workspace for managing
          searches and API access. The service is currently in beta. Read the{" "}
          <Link href="/privacy">Privacy Policy</Link> for how account and usage
          information is handled.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and API keys",
    content: (
      <>
        <p>
          Provide accurate account information and keep passwords, API keys, and
          authenticator codes secure. Use API keys from your backend rather than
          exposing them in public client code. You are responsible for activity
          you authorize through your account and for reporting suspected
          compromise.
        </p>
        <p>
          Respect key scopes, expiry dates, project quotas, and rate limits.
          Revoke credentials that are no longer needed. Do not share access to
          bypass account limits or access someone else’s workspace.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Image rights stay with their owners",
    content: (
      <>
        <p>
          Finding an image through Pluko does not grant you a license to copy,
          modify, distribute, or use it commercially. Copyright and other rights
          remain with the relevant owners. Check the original source and obtain
          permission where needed, or establish another lawful basis for your
          use.
        </p>
        <p>
          Source links, dimensions, and licensing fields may be incomplete or
          inaccurate. An unknown license is not permission. Watermark filtering
          is a heuristic and does not guarantee watermark-free results. Pluko
          does not remove watermarks.
        </p>
        <p>
          You remain responsible for how you use results, including attribution
          requirements, privacy, publicity, and other rights that may apply.
          Pluko does not host the original result images or control changes made
          by their source websites.
        </p>
      </>
    ),
  },
  {
    id: "rules",
    title: "Acceptable use",
    content: (
      <>
        <ul>
          <li>Use the service lawfully and respect the rights of others.</li>
          <li>
            Do not attempt to access other users’ accounts, keys, logs, or
            results without permission.
          </li>
          <li>
            Do not bypass rate limits, access restrictions, or other protective
            controls.
          </li>
          <li>
            Do not use the service to facilitate harassment, privacy violations,
            infringement, or other unlawful activity.
          </li>
          <li>
            Do not submit malicious payloads, deliberately overload the service,
            or interfere with its operation.
          </li>
          <li>
            Do not send sensitive personal information or secrets that the
            service does not need to perform an image search.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "availability",
    title: "Results, limits, and availability",
    content: (
      <>
        <p>
          Searches run as background jobs. A request can finish with fewer
          images than requested because of source availability, duplicates,
          filtering, quotas, or provider errors. Handle partial and cancelled
          jobs in your integration.
        </p>
        <p>
          We do not promise a fixed response time, uninterrupted availability, a
          particular result count, or accurate and suitable results. Providers
          can change their systems or restrict access, and image URLs can stop
          working. Features and limits may change as the beta develops.
        </p>
        <p>
          The service is provided on an “as available” basis. Nothing in these
          terms excludes obligations, remedies, or liabilities that cannot
          lawfully be excluded. Keep appropriate backups and assess whether the
          beta is suitable for your intended use.
        </p>
      </>
    ),
  },
  {
    id: "access",
    title: "Suspension and ending use",
    content: (
      <>
        <p>
          pStack may restrict or suspend access to address misuse, security
          incidents, legal requirements, or threats to service availability.
          Where practical and appropriate, we will explain the restriction and
          how to contact us about it.
        </p>
        <p>
          You can stop using Pluko and revoke your keys at any time. Contact us
          to request account closure or data deletion. Ending access does not
          automatically erase logs or backups; the retention practices in the
          Privacy Policy apply.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <p>
        We may revise these terms as the service changes. The date above
        identifies the latest version. We will provide additional notice of
        material changes where required. If you do not agree to updated terms,
        stop using the service and contact us about closing your account. These
        terms do not override rights provided by applicable law.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact and image-rights reports",
    content: (
      <>
        <LegalContact />
        <p>
          For an image-rights concern, include the source URL, the relevant
          Pluko result or job ID if available, your relationship to the rights
          holder, and a description of the concern. Do not include unrelated
          personal data. Removing or excluding a result from Pluko does not
          remove the image from its original host.
        </p>
      </>
    ),
  },
];
export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      introduction="The rules for using Pluko, keeping your account secure, and working responsibly with image results."
      sections={sections}
    />
  );
}
