"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ImageIcon,
  Link2,
  Code2,
  Layers,
  KeyRound,
  FolderKanban,
  SlidersHorizontal,
  Check,
  ClipboardList,
  MousePointer2,
  Braces,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader, SiteFooter } from "./site-header";
import { CodePlayground } from "./code-playground";
import { collections, faqs } from "@/lib/marketing/content";
import styles from "./marketing.module.css";

function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (
      !node ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    node.dataset.animate = "true";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${styles.reveal} ${className}`}>
      {children}
    </div>
  );
}

export function SampleImage({ photo, className = "", eager = false }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef(null);
  useEffect(() => {
    // A server-rendered image can fail before hydration attaches onError.
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [photo.url]);
  return failed ? (
    <span
      className={`${styles.imageFallback} ${className}`}
      role="img"
      aria-label={photo.title}
    >
      <ImageIcon />
      <span>Preview unavailable</span>
    </span>
  ) : (
    <img
      ref={imageRef}
      className={className}
      src={photo.url}
      alt={photo.title}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width="640"
      height="480"
      onError={() => setFailed(true)}
    />
  );
}

function ImageSearchDemo() {
  const [category, setCategory] = useState("Architecture");
  const [selected, setSelected] = useState(0);
  const group = collections.find((item) => item.name === category);
  return (
    <div className={styles.searchDemo}>
      <div className={styles.previewTop}>
        <span>
          <span className={styles.statusDot} /> IMAGE EXPLORER
        </span>
        <span>Example results</span>
      </div>
      <div className={styles.queryBar}>
        <Search size={18} />
        <span>{group.query}</span>
        <span className={styles.enterKey}>↵</span>
      </div>
      <Tabs
        value={category}
        onValueChange={(value) => {
          setCategory(value);
          setSelected(0);
        }}
      >
        <TabsList variant="line" aria-label="Example query category">
          {collections.map((item) => (
            <TabsTrigger key={item.name} value={item.name}>
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category}>
          <div className={styles.imageGrid} key={category}>
            {group.photos.map((photo, index) => (
              <button
                key={`${photo.id}-${index}`}
                type="button"
                className={`${styles.imageTile} ${selected === index ? styles.imageSelected : ""}`}
                onClick={() => setSelected(index)}
                aria-label={`Inspect ${photo.title}`}
                aria-pressed={selected === index}
              >
                <SampleImage photo={photo} eager={index < 3} />
                {selected === index && (
                  <span className={styles.selectedCheck}>
                    <Check size={12} />
                  </span>
                )}
                <span className={styles.tileIndex}>0{index + 1}</span>
              </button>
            ))}
          </div>
          <div className={styles.selectedMeta} aria-live="polite">
            <div>
              <span className={styles.statusDot} />
              <span>{group.photos[selected].title}</span>
            </div>
            <span>
              URL + metadata
              <ArrowUpRight size={13} />
            </span>
          </div>
          <div className={styles.demoCaption}>
            Curated samples. Explore categories and select an image.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const fields = [
  [
    "image_url",
    "Image URL",
    "The original image address. Your application loads the image directly from its host.",
    "https://source.example/image.jpg",
  ],
  [
    "thumbnail_url",
    "Thumbnail URL",
    "A smaller preview, when the source provides one. Useful for browsing results before loading the full image.",
    "https://source.example/preview.jpg",
  ],
  [
    "source_url",
    "Source URL",
    "The page where the image was found. Keep this context when reviewing attribution and reuse rights.",
    "https://source.example/photo",
  ],
  [
    "dimensions",
    "Dimensions",
    "Available width and height from provider metadata. Pluko does not download the image to verify its dimensions.",
    "1600 × 1200",
  ],
];

function ResultDetails() {
  const [active, setActive] = useState("image_url");
  const detail = fields.find((item) => item[0] === active);
  return (
    <div className={styles.resultLayout}>
      <div className={styles.featurePhoto}>
        <SampleImage photo={collections[0].photos[0]} />
        <div>
          <Badge variant="secondary">EXAMPLE IMAGE</Badge>
          <span>Form follows curiosity.</span>
        </div>
      </div>
      <div className={styles.resultInfo}>
        <div className={styles.monoLabel}>
          <Braces size={16} /> A RESULT, UNPACKED
        </div>
        <h2>
          More than
          <br />
          an image link.
        </h2>
        <p>
          Keep the image and its source together. Each result includes the
          available metadata your application needs to display and review it.
        </p>
        <div className={styles.fieldList}>
          {fields.map(([key, label, , value]) => (
            <button
              type="button"
              key={key}
              aria-pressed={active === key}
              onClick={() => setActive(key)}
              className={active === key ? styles.fieldActive : ""}
            >
              <span>{key}</span>
              <span>{value}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <div className={styles.fieldExplanation} aria-live="polite">
          <strong>{detail[1]}</strong>
          <p>{detail[2]}</p>
          <small>
            Illustrative metadata, not the sample photo’s measured dimensions.
          </small>
        </div>
      </div>
    </div>
  );
}

function WorkspacePreview() {
  const [view, setView] = useState("Playground");
  return (
    <div className={styles.workspace}>
      <div className={styles.workspaceBar}>
        <span>
          <img src="/logo.svg" width="20" height="20" alt="" />
          pluko <span>/</span> Example workspace
        </span>
        <Badge variant="outline">Sample data</Badge>
      </div>
      <div className={styles.workspaceBody}>
        <aside aria-label="Preview screens">
          <span className={styles.monoLabel}>WORKSPACE</span>
          {[
            ["Playground", Search],
            ["Search jobs", Layers],
            ["Request logs", ClipboardList],
          ].map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => setView(name)}
              aria-pressed={view === name}
              className={view === name ? styles.previewActive : ""}
            >
              <Icon size={15} />
              {name}
            </button>
          ))}
          <div className={styles.previewAccount}>
            <span>P</span>
            <div>
              Example application<small>Demo workspace</small>
            </div>
          </div>
        </aside>
        <div className={styles.workspaceMain}>
          <Tabs value={view} onValueChange={setView}>
            <TabsList aria-label="Workspace preview">
              {["Playground", "Search jobs", "Request logs"].map((name) => (
                <TabsTrigger value={name} key={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={view}>
              <div key={view} className={styles.workspacePanel}>
                <h3>{view}</h3>
                <p>
                  {view === "Playground"
                    ? "Find images, inspect results, and build your integration."
                    : view === "Search jobs"
                      ? "Follow every search from queued to complete."
                      : "See the request, response, and time spent."}
                </p>
                {view === "Playground" ? (
                  <>
                    <div className={styles.previewForm}>
                      <span>
                        <small>Project</small>Example application
                      </span>
                      <span>
                        <small>Images requested</small>15
                      </span>
                    </div>
                    <div className={styles.previewQuery}>
                      <Search size={16} />
                      concrete architecture
                      <Badge variant="secondary">Example query</Badge>
                    </div>
                    <div className={styles.previewImages}>
                      {collections[0].photos.slice(0, 3).map((photo, i) => (
                        <SampleImage photo={photo} key={i} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.previewTable}>
                    <div>
                      <span>{view === "Search jobs" ? "Query" : "Route"}</span>
                      <span>Status</span>
                      <span>
                        {view === "Search jobs" ? "Results" : "Method"}
                      </span>
                    </div>
                    {(view === "Search jobs"
                      ? [
                          ["concrete architecture", "Complete", "15 / 15"],
                          ["mountain landscape", "Running", "6 / 20"],
                          ["everyday objects", "Queued", "0 / 10"],
                        ]
                      : [
                          ["/v1/images/search", "202", "POST"],
                          ["/v1/jobs/job_example", "200", "GET"],
                          ["/v1/jobs/job_example/results", "200", "GET"],
                        ]
                    ).map(([name, status, value]) => (
                      <div key={name}>
                        <span>{name}</span>
                        <Badge variant="outline">{status}</Badge>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className={styles.workspaceCaption}>
        <MousePointer2 size={14} /> Switch views to explore the workspace.{" "}
        <Link href="/app">
          Open your workspace <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    // Old administrator invitations and reset links used /#accept=TOKEN.
    if (new URLSearchParams(window.location.hash.slice(1)).has("accept"))
      window.location.replace(`/app${window.location.hash}`);
  }, []);
  return (
    <div className={styles.site}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span /> IMAGE SEARCH FOR DEVELOPERS
            </div>
            <h1>
              Image search,
              <br />
              built into <br />
              <span>your product.</span>
            </h1>
            <p>
              Find images across the web and retrieve their URLs, sources, and
              metadata through a straightforward API.
            </p>
            <div className={styles.heroActions}>
              <Button size="lg" asChild>
                <Link href="/app?mode=register">
                  Get started
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#developers">
                  Explore the API
                  <Code2 />
                </Link>
              </Button>
            </div>
            <div className={styles.heroNote}>
              <span>One query or a whole batch.</span>
              <span>Image URLs. Source context. JSON.</span>
            </div>
          </div>
          <ImageSearchDemo />
        </section>
        <div className={styles.capabilityStrip}>
          {[
            [ImageIcon, "Full-image URLs"],
            [Link2, "Source context"],
            [Layers, "Batch queries"],
            [Code2, "Structured results"],
          ].map(([Icon, text]) => (
            <span key={text}>
              <Icon size={16} />
              {text}
            </span>
          ))}
        </div>
        <section id="product" className={styles.section}>
          <Reveal>
            <ResultDetails />
          </Reveal>
        </section>
        <section
          id="how-it-works"
          className={`${styles.section} ${styles.workflowSection}`}
        >
          <Reveal>
            <div className={styles.sectionIntro}>
              <span className={styles.eyebrow}>THE SHORT VERSION</span>
              <h2>
                From a query to
                <br />a page of results.
              </h2>
              <p>A small integration. A clear path from request to response.</p>
            </div>
            <div className={styles.workflow}>
              {[
                [
                  Search,
                  "Send a search",
                  "Choose a query and the number of images you want.",
                  "POST /v1/images/search",
                ],
                [
                  Layers,
                  "Follow the job",
                  "Check progress while Pluko processes the search.",
                  "queued → running → complete",
                ],
                [
                  ImageIcon,
                  "Fetch the results",
                  "Retrieve results in pages and use the URLs in your application.",
                  "image_url · source_url · metadata",
                ],
              ].map(([Icon, title, copy, code], index) => (
                <div key={title}>
                  <div className={styles.workflowTop}>
                    <span>
                      <Icon size={20} />
                    </span>
                    <small>0{index + 1}</small>
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <code>{code}</code>
                </div>
              ))}
            </div>
            <p className={styles.quietNote}>
              Searches run asynchronously. Result availability can vary by query
              and source.
            </p>
          </Reveal>
        </section>
        <section id="developers" className={styles.section}>
          <Reveal>
            <div className={styles.sectionSplit}>
              <div>
                <span className={styles.eyebrow}>MADE TO INTEGRATE</span>
                <h2>
                  A few requests.
                  <br />A clear response.
                </h2>
              </div>
              <div>
                <p>
                  Create a project, generate an API key, and call Pluko from
                  your backend.
                </p>
                <Link className={styles.textLink} href="/docs">
                  Read the integration guide
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <CodePlayground />
            <p className={styles.quietNote}>
              <KeyRound size={13} /> Your API key belongs on your server.
            </p>
          </Reveal>
        </section>
        <section className={`${styles.section} ${styles.workspaceSection}`}>
          <Reveal>
            <div className={styles.sectionIntro}>
              <span className={styles.eyebrow}>A WORKSPACE TO MATCH</span>
              <h2>
                See what happens
                <br />
                after the request.
              </h2>
              <p>
                Test searches, follow jobs, and inspect request history from one
                workspace.
              </p>
            </div>
            <WorkspacePreview />
          </Reveal>
        </section>
        <section className={styles.section}>
          <Reveal>
            <div className={styles.sectionSplit}>
              <div>
                <span className={styles.eyebrow}>ROOM TO BUILD</span>
                <h2>
                  Ready for more
                  <br />
                  than one query.
                </h2>
              </div>
              <p>
                Start with one application. Keep your searches and access
                organized as you add more.
              </p>
            </div>
            <div className={styles.featureGrid}>
              <article className={styles.batchFeature}>
                <Layers />
                <h3>Batch searches</h3>
                <p>
                  Send multiple queries together, each with its own requested
                  count.
                </p>
                <div className={styles.batchRows}>
                  {[
                    ["concrete architecture", "15"],
                    ["mountain landscape", "30"],
                    ["everyday objects", "10"],
                  ].map(([query, count]) => (
                    <div key={query}>
                      <Search size={13} />
                      <span>{query}</span>
                      <code>{count} images</code>
                    </div>
                  ))}
                </div>
                <span className={styles.smallNote}>
                  One job. Individual query progress.
                </span>
              </article>
              <div className={styles.smallFeatures}>
                {[
                  [
                    FolderKanban,
                    "Project-level organization",
                    "Keep applications, keys, and usage organized by project.",
                  ],
                  [
                    KeyRound,
                    "Scoped API keys",
                    "Control access with scopes, expiration dates, and revocation.",
                  ],
                  [
                    SlidersHorizontal,
                    "Quality feedback",
                    "Flag irrelevant, broken, or watermarked results from the workspace.",
                  ],
                ].map(([Icon, title, copy]) => (
                  <article key={title}>
                    <Icon size={19} />
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <p className={styles.quietNote}>
              Large requests are paginated jobs. Sources and quotas determine
              how many results are available.
            </p>
          </Reveal>
        </section>
        <section
          className={`${styles.section} ${styles.responsibility}`}
          aria-labelledby="responsibility-heading"
        >
          <Reveal>
            <span className={styles.eyebrow}>DATA & IMAGE RIGHTS</span>
            <h2 id="responsibility-heading">
              Clear about what stays.
              <br />
              Careful about what you use.
            </h2>
            <div className={styles.responsibilityGrid}>
              <div>
                <ImageIcon size={20} />
                <h3>URLs, not stored images.</h3>
                <p>
                  Pluko stores search metadata and operational logs. Result
                  images load from their original hosts.
                </p>
              </div>
              <div>
                <Link2 size={20} />
                <h3>The source still matters.</h3>
                <p>
                  A search result is not a license. Check the source and its
                  permissions before using an image.
                </p>
              </div>
              <div>
                <ClipboardList size={20} />
                <h3>Know how your data is used.</h3>
                <p>
                  Read about account data, log retention, administrator access,
                  and how to request help.
                </p>
              </div>
            </div>
            <div className={styles.legalLinks}>
              <Link href="/privacy">
                Read the Privacy Policy <ArrowUpRight size={14} />
              </Link>
              <Link href="/terms">
                Read the Terms of Service <ArrowUpRight size={14} />
              </Link>
            </div>
          </Reveal>
        </section>
        <section className={`${styles.section} ${styles.faqSection}`}>
          <Reveal className={styles.faqLayout}>
            <div>
              <span className={styles.eyebrow}>GOOD QUESTIONS</span>
              <h2>
                Before you
                <br />
                integrate.
              </h2>
              <Link className={styles.textLink} href="/docs">
                More in the docs
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <Accordion type="single" collapsible>
              {faqs.map(([question, answer], index) => (
                <AccordionItem value={String(index)} key={question}>
                  <AccordionTrigger>{question}</AccordionTrigger>
                  <AccordionContent>{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>
        <section className={styles.closing}>
          <Reveal>
            <span className={styles.eyebrow}>LET’S MAKE SOMETHING</span>
            <h2>
              Your next feature
              <br />
              needs images.
            </h2>
            <p>
              Try a search in the playground, then connect your application.
            </p>
            <div className={styles.heroActions}>
              <Button size="lg" asChild>
                <Link href="/app?mode=register">
                  Get started
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/docs">
                  Read the docs
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className={styles.closingImages} aria-hidden="true">
              {collections.map((group) => (
                <div key={group.name}>
                  <SampleImage photo={group.photos[0]} />
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
