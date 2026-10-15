import Link from "next/link";
import { SiteHeader, SiteFooter } from "./site-header";
import styles from "./marketing.module.css";

// Shared shell for plain public pages (limits, status, contact): header, side navigation, article, footer.
export default function InfoPage({ eyebrow, title, introduction, sections, children }) {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main className={styles.docsLayout}>
        <nav className={styles.docsNav} aria-label={`${title} sections`}>
          <strong>{eyebrow}</strong>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          <Link href="/docs">API documentation</Link>
          <Link href="/limits">Limits</Link>
          <Link href="/status">Status</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <article className={`${styles.docsMain} ${styles.legalContent}`}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{introduction}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
