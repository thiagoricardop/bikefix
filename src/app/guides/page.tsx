import type { Metadata } from "next";
import Link from "next/link";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { GUIDE_CONTENT_INVENTORY, GUIDE_CONTENT_SUMMARY } from "@/data/guides/content-inventory";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Repair library",
  description: "Browse BikeFix repair topics with source and qualified-review status clearly identified.",
  robots: { index: GUIDE_CONTENT_SUMMARY.published > 0, follow: true },
  ...(getCanonicalUrl("/guides") ? { alternates: { canonical: getCanonicalUrl("/guides") } } : {}),
};

const inventoryByGuideId = new Map(GUIDE_CONTENT_INVENTORY.map((item) => [item.guideId, item]));

export default function GuidesPage() {
  return (
    <main id="main-content" className="guide-library-page page-shell">
      <header className="guide-library-heading">
        <p className="eyebrow">THE REPAIR LIBRARY</p>
        <h1>Clear steps.<br /><span>Honest about the limits.</span></h1>
        <p>Browse eight source-linked repair-guide drafts covering common maintenance and troubleshooting topics. Each guide clearly shows its review status and limits.</p>
      </header>

      <aside className="guide-library-notice" aria-label="Library content status">
        <span className="guide-library-notice-icon" aria-hidden="true">i</span>
        <div>
          <strong>{GUIDE_CONTENT_SUMMARY.published === 0 ? "No guides are currently marked published." : `${GUIDE_CONTENT_SUMMARY.published} guide${GUIDE_CONTENT_SUMMARY.published === 1 ? " is" : "s are"} marked published.`}</strong>
          <p>The initial topics have technical references, but none has a recorded qualified mechanical review. These drafts are not approved repair procedures. Check the editorial inventory to see source coverage and remaining review gates.</p>
        </div>
      </aside>

      <p className="guide-inventory-link"><Link href="/guides/content-inventory">View content inventory and review requirements →</Link></p>

      <section className="guide-library-grid" aria-label="Available guide records">
        {REPAIR_GUIDES.map((guide) => {
          const inventory = inventoryByGuideId.get(guide.id);
          const status = inventory?.contentStatus ?? "Status unavailable · not verified";
          return (
            <article className="guide-library-card" key={guide.id}>
              <div className="guide-library-card-top"><span className={`guide-library-status ${inventory?.published ? "guide-library-status--published" : ""}`}>{status}</span><span className="guide-library-time">{guide.estimatedMinutes} min</span></div>
              <p className="eyebrow">{guide.difficulty.toUpperCase()} · {guide.steps.length} STEP{guide.steps.length === 1 ? "" : "S"}</p>
              <h2><Link href={`/guides/${guide.slug}`}>{guide.title}<span aria-hidden="true"> ↗</span></Link></h2>
              <p>{guide.summary}</p>
              <p className="guide-library-source-count">{inventory?.sourceCount ?? 0} resolved technical reference{inventory?.sourceCount === 1 ? "" : "s"} · {inventory?.mechanicallyReviewed ? "mechanical review recorded" : "qualified review pending"}</p>
              <div className="guide-library-tags">{guide.bicycleTypes.map((type) => <span key={type}>{type === "ebike" ? "E-bike" : type}</span>)}</div>
              <Link className="guide-library-open" href={`/guides/${guide.slug}`}>Open guide <span aria-hidden="true">→</span></Link>
            </article>
          );
        })}
      </section>

      <aside className="guide-request-help" aria-label="Missing guide help"><div><strong>Can&apos;t find the topic you need?</strong><p>Suggest a repair-guide topic so the developer can consider it for a future, reviewed guide.</p></div><Link className="button button--dark" href="/request-repair-guide">Request a guide <span aria-hidden="true">→</span></Link></aside>
      <footer className="guide-library-footer"><Link href="/#interactive-explorer">← Back to bicycle explorer</Link><span>Draft status is shown per record; this library does not certify bicycle safety.</span></footer>
    </main>
  );
}
