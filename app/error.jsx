"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/site/ui";
import site from "@/components/design/design.module.css";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PublicShell>
      <section className="px-5 pt-40 pb-32 text-center sm:px-8 sm:pt-48">
        <p className="font-mono text-sm text-muted-foreground">Something broke</p>
        <h1 className={`${site.title} mx-auto mt-4 max-w-3xl`}>Something went wrong.</h1>
        <p className={`${site.lede} mx-auto mt-6 max-w-xl`}>This page hit an unexpected error. Trying again usually fixes it. If it keeps happening, tell us what you were doing.</p>
        {error?.digest && <p className="mt-6 text-sm text-muted-foreground">Reference: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{error.digest}</code></p>}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 rounded-full px-7 text-base" onClick={() => reset()}><RotateCcw />Try again</Button>
          <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base"><Link href="/">Go home</Link></Button>
          <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base"><Link href="/contact">Contact us</Link></Button>
        </div>
      </section>
    </PublicShell>
  );
}
