import LandingPage from "@/components/landing/landing-page";

export const metadata = {
  title: "Pluko — Every image. One API.",
  description:
    "Search the web for images and get back URLs, sources and metadata your product can use. One query or thousands, in a single job, with signed webhooks and a full workspace.",
  openGraph: {
    title: "Pluko — Every image. One API.",
    description: "Image search infrastructure that returns URLs, sources and metadata through a small, versioned API.",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
