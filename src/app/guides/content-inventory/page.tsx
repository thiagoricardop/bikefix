import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_CONTENT_INVENTORY, GUIDE_CONTENT_SUMMARY } from "@/data/guides/content-inventory";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Guide content inventory",
  description: "Editorial status, technical source coverage, and human review requirements for BikeFix's initial repair-guide catalog.",
  robots: { index: false, follow: false },
  ...(getCanonicalUrl("/guides/content-inventory") ? { alternates: { canonical: getCanonicalUrl("/guides/content-inventory") } } : {}),
};

export default function GuideContentInventoryPage() {
  return (
    <main id="main-content" className="guide-inventory-page page-shell">
      <nav className="guide-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/guides">Repair library</Link><span aria-hidden="true">/</span><span>Content inventory</span>
      </nav>

      <header className="guide-inventory-heading">
        <p className="eyebrow">EDITORIAL WORKFLOW</p>
        <h1>Content inventory</h1>
        <p>Source coverage and technical review are different milestones. The references below informed drafts; they do not mean a qualified mechanic has approved these procedures.</p>
      </header>

      <section className="guide-inventory-summary" aria-label="Catalog totals">
        <article><strong>{GUIDE_CONTENT_SUMMARY.total}</strong><span>Catalog guides</span></article>
        <article><strong>{GUIDE_CONTENT_SUMMARY.sourced}</strong><span>Have linked source references</span></article>
        <article><strong>{GUIDE_CONTENT_SUMMARY.mechanicallyReviewed}</strong><span>Qualified reviews recorded</span></article>
        <article><strong>{GUIDE_CONTENT_SUMMARY.published}</strong><span>Published</span></article>
      </section>

      <aside className="guide-inventory-warning">
        <strong>Publication gate is still closed.</strong>
        <p>No qualified mechanic review was performed or recorded as part of this implementation. Keep each guide at its truthful editorial state; do not present it as reviewed or published until a competent reviewer checks the procedure, bicycle-system scope, stop conditions, and source applicability.</p>
      </aside>

      <section className="guide-inventory-list" aria-label="Guide-by-guide editorial status">
        {GUIDE_CONTENT_INVENTORY.map((item) => (
          <article className="guide-inventory-card" key={item.guideId}>
            <div className="guide-inventory-card-heading">
              <div>
                <p className="eyebrow">{item.guideId}</p>
                <h2><Link href={`/guides/${item.slug}`}>{item.title}</Link></h2>
              </div>
              <span className={`guide-inventory-status ${item.published ? "guide-inventory-status--published" : item.reviewStatus === "in-review" ? "guide-inventory-status--review" : ""}`}>{item.contentStatus}</span>
            </div>
            <div className="guide-inventory-facts">
              <p><strong>Technical sourcing:</strong> {item.sourceCount > 0 ? `${item.sourceCount} linked reference${item.sourceCount === 1 ? "" : "s"}` : "Source gap"}</p>
              <p><strong>Mechanical review:</strong> {item.mechanicallyReviewed ? `Recorded by ${item.reviewer} on ${item.reviewedAt}` : "Pending — no reviewer/date recorded"}</p>
              <p><strong>Media:</strong> {item.mediaStatus}</p>
            </div>
            <h3>References</h3>
            {item.sources.length ? (
              <ul className="guide-inventory-sources">
                {item.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><span>{source.publisher}</span></li>)}
              </ul>
            ) : <p>No resolvable source references. Do not publish.</p>}
            <h3>Remaining gates</h3>
            <ul className="guide-inventory-blockers">{item.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </article>
        ))}
      </section>

      <footer className="guide-library-footer"><Link href="/guides">← Return to repair library</Link><span>References are not endorsements or permission to reproduce source media.</span></footer>
    </main>
  );
}
