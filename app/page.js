import { preconnect } from "react-dom";
import LandingPage from "@/components/landing/landing-page";
import { JsonLd } from "@/components/site/json-ld";
import { faqPage, organization, softwareApplication, website } from "@/lib/jsonld";
import { faqs } from "@/lib/marketing/content";
import { pageMetadata } from "@/lib/site-meta";

export const metadata = pageMetadata("/", {
  title: "Pluko — Image Search API for Developers",
  description:
    "Pluko is an image search API for developers. Send a query, get back image URLs, sources and metadata as JSON. One query or thousands in a single job, with filters, signed webhooks and a full workspace.",
  shareDescription:
    "Image search infrastructure that returns URLs, sources and metadata through a small, versioned API.",
});

export default function Home() {
  // The first sample photos load straight away from Unsplash; opening the connection early speeds up the first paint.
  preconnect("https://images.unsplash.com");
  return (
    <>
      <JsonLd nodes={[organization(), website(), softwareApplication(), faqPage(faqs)]} />
      <LandingPage />
    </>
  );
}
