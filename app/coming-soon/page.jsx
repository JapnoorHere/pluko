import ComingSoon from "@/components/landing/coming-soon";
import { pageMetadata } from "@/lib/site-meta";

// Served at "/" while pre-launch mode is on (see server.mjs), so the canonical address is the home page.
export const metadata = pageMetadata("/", {
  title: "Pluko — Image search API, coming soon",
  description:
    "Pluko is an image-search API for developers: send a query, get back image URLs, sources and metadata. Join the waitlist to hear when it opens.",
});

export default function ComingSoonPage() {
  return <ComingSoon />;
}
