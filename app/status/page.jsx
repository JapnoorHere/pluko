import Link from "next/link";
import InfoPage from "@/components/marketing/info-page";
import StatusView from "@/components/marketing/status-view";

export const metadata = {
  title: "Status — Pluko",
  description: "Is Pluko working right now? A live check of the API, the search worker, and the image source.",
};

const sections = [
  ["now", "Right now"],
  ["about", "About this page"],
];

export default function Status() {
  return (
    <InfoPage
      eyebrow="PLUKO / STATUS"
      title="Service status"
      introduction="A live check of the parts of Pluko that searches depend on."
      sections={sections}
    >
      <section id="now">
        <h2>Right now</h2>
        <StatusView />
      </section>
      <section id="about">
        <h2>About this page</h2>
        <p>
          This is a live check, not a history. Pluko does not publish uptime
          percentages or past incidents here. If something looks wrong and this
          page says all is well, see the <Link href="/contact">contact page</Link>
          . Machine-readable status is available at <code>GET /v1/status</code>{" "}
          without an API key.
        </p>
        <p>
          <strong>Degraded</strong> means the API is up, but the search worker
          is offline or the image source is paused. Searches you create still
          queue and will run when it recovers.
        </p>
      </section>
    </InfoPage>
  );
}
