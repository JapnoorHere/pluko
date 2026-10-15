"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import styles from "./marketing.module.css";
import { legal } from "@/lib/legal";

export function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Pluko home">
      <img src="/logo.svg" width="29" height="29" alt="" />
      pluko<span className={styles.beta}>BETA</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["/#product", "Product"],
    ["/#how-it-works", "How it works"],
    ["/#developers", "Developers"],
  ];
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav aria-label="Main navigation" className={styles.desktopNav}>
          {links.map(([href, text]) => (
            <Link key={href} href={href}>
              {text}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Button variant="ghost" asChild className={styles.signIn}>
            <Link href="/app">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/app?mode=register">
              Get started
              <ArrowUpRight />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className={styles.mobileMenu}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Explore Pluko</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile navigation" className="grid gap-4 px-4">
                {[
                  ...links,
                  ["/docs", "Documentation"],
                  ["/limits", "Limits"],
                  ["/status", "Status"],
                  ["/contact", "Contact"],
                  ["/app", "Sign in"],
                ].map(([href, text]) => (
                  <Link onClick={() => setOpen(false)} key={href} href={href}>
                    {text}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Brand />
        <p>Image search for your applications.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/#product">Product</Link>
        <Link href="/#developers">Developers</Link>
        <Link href="/docs">Documentation</Link>
        <Link href="/limits">Limits</Link>
        <Link href="/status">Status</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/app">Sign in</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <div className={styles.footerBottom}>
        <span>
          © {new Date().getFullYear()} Pluko · By{" "}
          <a href={legal.website}>{legal.operator}</a>
        </span>
        <span>
          Sample photography from{" "}
          <a href="https://unsplash.com" target="_blank" rel="noreferrer">
            Unsplash ↗
          </a>
        </span>
      </div>
    </footer>
  );
}
