import Link from "next/link";
import { Activity, ArrowRight, BookOpen, Home, LogIn } from "lucide-react";
import { PublicShell, Reveal } from "@/components/site/ui";
import site from "@/components/design/design.module.css";

export const metadata = { title: "Page not found — Pluko", robots: { index: false } };

const links = [
  ["/", Home, "Home", "Start from the beginning."],
  ["/docs", BookOpen, "Documentation", "Endpoints, filters and webhooks."],
  ["/status", Activity, "System status", "Check that everything is running."],
  ["/app", LogIn, "Sign in", "Go to your workspace."],
];

export default function NotFound() {
  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden px-5 pt-40 pb-28 text-center sm:px-8 sm:pt-48">
        <div className={site.glow} style={{ inset: "10% 15% 30%", opacity: 0.45 }} aria-hidden />
        <Reveal><p className="font-mono text-sm text-muted-foreground">Error 404</p></Reveal>
        <Reveal delay={60}><h1 className={`${site.title} mx-auto mt-4 max-w-3xl`}>This page went missing.</h1></Reveal>
        <Reveal delay={120}><p className={`${site.lede} mx-auto mt-6 max-w-xl`}>The link may be old, or the page may have moved. These are good places to pick things back up.</p></Reveal>
        <div className="mx-auto mt-14 grid max-w-4xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {links.map(([href, Icon, title, text], index) => (
            <Reveal key={href} delay={180 + index * 50}>
              <Link href={href} className="group flex h-full flex-col rounded-2xl border bg-background/70 p-5 backdrop-blur transition-colors hover:bg-muted/60">
                <Icon className="size-5 text-[var(--accent-ink)]" />
                <span className="mt-4 flex items-center gap-1 font-medium">{title}<ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
                <span className="mt-1 text-sm text-muted-foreground">{text}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
