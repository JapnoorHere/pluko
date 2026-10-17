import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, BookOpen, Download, Gauge, KeyRound, LifeBuoy, ShieldAlert, TrendingUp, UserLock } from "lucide-react";
import { legal } from "@/lib/legal";
import { Callout, PageHero, PublicShell, Reveal } from "@/components/site/ui";

export const metadata = {
  title: "Contact — Pluko",
  description:
    "How to reach the Pluko team for support, limits, privacy requests, or to report misuse or a security problem.",
};

const mail = (subject) => `mailto:${legal.email}?subject=${encodeURIComponent(subject)}`;

const reasons = [
  [LifeBuoy, "Support", "Something isn’t working, or you have a question about your integration.", "Pluko support"],
  [TrendingUp, "Higher limits", "You need more provider pages a day or a higher request rate.", "Pluko higher limits"],
  [UserLock, "Privacy requests", "Correct, export or delete information we hold about you.", "Pluko privacy request"],
  [ShieldAlert, "Security and misuse", "Report a vulnerability, abuse, or an image-rights concern.", "Security"],
];

const selfService = [
  ["/status", Activity, "Is it up?", "Live state of the API, worker and image source."],
  ["/limits", Gauge, "Limits", "Rates, daily usage and retention."],
  ["/docs", BookOpen, "Documentation", "Endpoints, error codes and webhooks."],
  ["/app/keys", KeyRound, "Rotate a key", "Revoke or rotate a key that may have leaked."],
  ["/app/account/data", Download, "Your data", "Download or delete your account data."],
];

export default function Contact() {
  return (
    <PublicShell>
      <PageHero eyebrow="Contact" title="Talk to us."
        actions={<a href={mail("Hello from the Pluko website")} className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-base font-medium text-background transition-opacity hover:opacity-85">{legal.email}<ArrowUpRight className="size-4" /></a>}>
        Pluko is built and run by a small team at {legal.operator}. Email is the best way to reach us. We reply as soon as we can, but there’s no guaranteed response time during the beta.
      </PageHero>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(([Icon, title, text, subject], index) => (
            <Reveal key={title} delay={index * 60}>
              <a href={mail(subject)} className="group flex h-full flex-col rounded-3xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-muted"><Icon className="size-5" /></span>
                <p className="mt-6 text-lg font-semibold tracking-tight">{title}</p>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-ink)]">Email us<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40 px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-semibold tracking-[-0.04em]">Help us help you faster.</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">A few details let us find the problem without a back-and-forth.</p>
          </Reveal>
          <Reveal delay={80} className="grid gap-5">
            <ul className="grid gap-3">
              {[
                <>The email address of your Pluko account.</>,
                <>The <code className="rounded bg-background px-1.5 py-0.5 font-mono text-sm">request_id</code> from the API response, and the <code className="rounded bg-background px-1.5 py-0.5 font-mono text-sm">job_id</code> if a search is involved. Every response has a request ID.</>,
                <>What you expected, what happened, and when (with your time zone).</>,
                <>For an image-rights concern: the source URL, the related result or job ID if you have it, and your relationship to the rights holder.</>,
              ].map((item, index) => (
                <li key={index} className="flex gap-3 rounded-2xl border bg-background p-4 text-[15px] leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Callout type="warning" title="Never send secrets">
              Don’t include passwords, API keys, webhook secrets or authenticator codes. If a key may have leaked, revoke or rotate it from the API keys page first.
            </Callout>
            <p className="text-[15px] leading-relaxed text-muted-foreground">Reporting a vulnerability? Use the subject “Security”, give us a reasonable chance to fix it before sharing it publicly, and don’t access other people’s data while testing.</p>
          </Reveal>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <Reveal><h2 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-semibold tracking-[-0.04em]">Or sort it out yourself.</h2></Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {selfService.map(([href, Icon, title, text], index) => (
              <Reveal key={href} delay={index * 50}>
                <Link href={href} className="group flex h-full flex-col rounded-2xl border p-5 transition-colors hover:bg-muted/50">
                  <Icon className="size-5 text-[var(--accent-ink)]" />
                  <span className="mt-4 flex items-center gap-1 font-medium">{title}<ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
                  <span className="mt-1 text-sm text-muted-foreground">{text}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
