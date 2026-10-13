import Link from "next/link";
import { SiteHeader, SiteFooter } from "./site-header";
import { legal } from "@/lib/legal";
import styles from "./marketing.module.css";

export function LegalContact() {
  return (
    <p>
      Pluko is operated by <a href={legal.website}>{legal.operator}</a>. For
      privacy requests, account assistance, or reports about misuse, email{" "}
      <a href={`mailto:${legal.email}`}>{legal.email}</a>. Website:{" "}
      <a href={legal.website}>pStack.in</a>. Include your account email and
      relevant request or job IDs, but never send passwords, API keys, or
      authenticator codes.
    </p>
  );
}

export default function LegalPage({ title, introduction, sections }) {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main className={styles.docsLayout}>
        <nav className={styles.docsNav} aria-label={`${title} sections`}>
          <strong>PLUKO / LEGAL</strong>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </nav>
        <article className={`${styles.docsMain} ${styles.legalContent}`}>
          <span className={styles.eyebrow}>
            LAST UPDATED · {legal.updated.toUpperCase()}
          </span>
          <h1>{title}</h1>
          <p>{introduction}</p>
          {sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
