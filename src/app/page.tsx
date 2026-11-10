import type { Metadata } from "next";
import Link from "next/link";
import { BikeTypeIllustration, type BikeTypeId } from "@/components/illustrations/bike-type-illustration";
import { HeroBikeIllustration } from "@/components/illustrations/hero-bike";
import { BicycleProfileIllustration } from "@/components/illustrations/bicycle-profile-illustration";
import { BicycleExplorer } from "@/components/bicycle-explorer/bicycle-explorer";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { GUIDE_CONTENT_SUMMARY } from "@/data/guides/content-inventory";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Visual bicycle repair guidance for everyday riders",
  description: "Explore your bicycle, understand common symptoms, and find safety-aware repair guidance with clear source and review status.",
  ...(getCanonicalUrl("/") ? { alternates: { canonical: getCanonicalUrl("/") } } : {}),
};

const bikeTypes: Array<{
  id: BikeTypeId;
  number: string;
  name: string;
  description: string;
  detail: string;
}> = [
  { id: "road", number: "01", name: "Road bike", description: "Made for paved miles and drop bars.", detail: "Narrow tires · Drop handlebars" },
  { id: "mountain", number: "02", name: "Mountain bike", description: "Built for trails, grip and control.", detail: "Wide tires · Flat bars" },
  { id: "hybrid", number: "03", name: "Hybrid / commuter", description: "Everyday comfort for the ride around town.", detail: "Versatile setup · Daily riding" },
  { id: "gravel", number: "04", name: "Gravel bike", description: "One bike for pavement and the road less traveled.", detail: "Mixed terrain · Drop bars" },
  { id: "ebike", number: "05", name: "E-bike", description: "Mechanical care for a ride with electric assist.", detail: "Motor assist · Extra system care" },
];


const reviewedGuideIndex = REPAIR_GUIDES
  .filter((guide) => guide.reviewStatus === "reviewed" && Boolean(guide.reviewedBy?.trim()) && Boolean(guide.reviewedAt) && guide.sourceIds.length > 0)
  .map(({ id, slug, title, bicycleTypes }) => ({ id, slug, title, bicycleTypes }));

const workflow = [
  { number: "01", title: "Choose your bike", body: "Start with the kind of bicycle you ride, or choose “I'm not sure” and keep going." },
  { number: "02", title: "Point to the part", body: "Explore a clear bicycle illustration and select the component that seems connected to the problem." },
  { number: "03", title: "Follow the next step", body: "Use plain-language instructions, useful visuals, and checkpoints to understand what to do next." },
];

const categories = [
  { number: "01", title: "Brakes", detail: "Rubbing, noise, feel and setup", icon: "brake" },
  { number: "02", title: "Gears & chain", detail: "Skipping, shifting and drivetrain noise", icon: "chain" },
  { number: "03", title: "Tires & wheels", detail: "Flats, rubbing and wheel concerns", icon: "wheel" },
];

function ArrowUpRight() {
  return <span aria-hidden="true" className="arrow-up-right">↗</span>;
}

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero-section page-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> BICYCLE CARE, MADE CLEARER</div>
          <h1 id="hero-title" aria-label="Less guessing. More riding.">Less guessing.<br /><span>More riding.</span></h1>
          <p className="hero-description">
            Bike problems can feel complicated. We&apos;re building a clearer way to identify the part, understand the symptom, and find a useful next step.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#interactive-explorer">Meet your bike <ArrowUpRight /></a>
            <a className="button button--quiet" href="#how-it-works">How BikeFix works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof" aria-label="BikeFix principles">
            <span><span className="proof-check" aria-hidden="true">✓</span> Beginner-first language</span>
            <span><span className="proof-check" aria-hidden="true">✓</span> Safety-aware guidance</span>
          </div>
        </div>

        <div className="hero-visual-wrap">
          <div className="hero-visual" aria-label="BikeFix bicycle explorer preview">
            <div className="visual-topline">
              <span className="visual-kicker">THE BIKEFIX EXPLORER</span>
              <span className="preview-pill"><span /> IN PROGRESS</span>
            </div>
            <div className="hero-bike-stage">
              <div className="visual-orbit visual-orbit--one" />
              <div className="visual-orbit visual-orbit--two" />
              <HeroBikeIllustration />
              <div className="visual-callout visual-callout--left"><span className="callout-dot" /> Know the part</div>
              <div className="visual-callout visual-callout--right"><span className="callout-dot callout-dot--lime" /> Find the next step</div>
            </div>
            <div className="visual-bottomline">
              <div><span className="mini-caption">DESIGNED AROUND</span><strong>Your actual bicycle</strong></div>
              <div className="visual-bottom-icon" aria-hidden="true">↗</div>
            </div>
          </div>
          <div className="hero-note"><span className="note-icon" aria-hidden="true">✳</span><span>Start by selecting a component on the bike below.</span></div>
        </div>
      </section>

      <section className="principles-strip" aria-label="Product principles">
        <div className="page-shell principles-inner">
          <span>Visual by design</span><span className="principle-divider" />
          <span>Plain language</span><span className="principle-divider" />
          <span>Built around safe decisions</span><span className="principle-divider" />
          <span>Five bicycle types</span>
        </div>
      </section>

      <section className="section page-shell workflow-section" id="how-it-works" aria-labelledby="workflow-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">A SIMPLE WAY THROUGH</p>
            <h2 id="workflow-title">From “what&apos;s wrong?”<br /><span>to a clearer next step.</span></h2>
          </div>
          <p className="section-intro">You shouldn&apos;t need to know every component name before you can start understanding your bike. BikeFix is being designed to meet you where you are.</p>
        </div>
        <div className="workflow-grid">
          {workflow.map((item) => (
            <article className="workflow-card" key={item.number}>
              <span className="workflow-number">{item.number}</span>
              <div className="workflow-line" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <BicycleExplorer reviewedGuides={reviewedGuideIndex} />

      <section className="section bike-types-section" id="bike-types" aria-labelledby="bike-types-title">
        <div className="page-shell">
          <div className="section-heading section-heading--center">
            <p className="eyebrow">YOUR RIDE, YOUR SETUP</p>
            <h2 id="bike-types-title">Five kinds of bikes.<br /><span>One friendlier starting point.</span></h2>
            <p className="section-intro">Choose one of the five bicycle types in the explorer above to update the illustration, select a part, and browse the matching component names.</p>
          </div>
          <div className="bike-type-grid">
            {bikeTypes.map((bike) => (
              <article className="bike-type-card" key={bike.id}>
                <div className="bike-type-card-top"><span>{bike.number}</span><span className="card-spark" aria-hidden="true">✳</span></div>
                <div className="bike-type-art-wrap"><BikeTypeIllustration type={bike.id} /></div>
                <div className="bike-type-card-copy">
                  <h3>{bike.name}</h3>
                  <p>{bike.description}</p>
                  <span className="bike-type-detail">{bike.detail}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="types-footnote"><span aria-hidden="true">ⓘ</span> Bicycle type helps narrow the options; it doesn&apos;t identify the exact brake, drivetrain, or other installed system.</p>
        </div>
      </section>

      <section className="section page-shell library-section" id="repair-library" aria-labelledby="library-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">THE REPAIR LIBRARY</p>
            <h2 id="library-title">Start with the part.<br /><span>Understand the problem.</span></h2>
          </div>
          <p className="section-intro">The library connects symptoms to structured guides, with source and review status made visible. The current records are draft player fixtures—not verified repair advice.</p>
        </div>
        <div className="category-preview-grid">
          {categories.map((category) => (
            <article className="category-preview-card" key={category.number}>
              <div className={`category-illustration category-illustration--${category.icon}`} aria-hidden="true">
                {category.icon === "brake" && <svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="19" stroke="currentColor" strokeWidth="3" /><circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="3" /><path d="M28 9v14m0 10v14M9 28h14m10 0h14M15 15l9 9m8 8 9 9M41 15l-9 9m-8 8-9 9" stroke="currentColor" strokeWidth="1.5" opacity=".45" /><path d="M37 9h8v11" stroke="#c1e65b" strokeWidth="4" strokeLinecap="round" /></svg>}
                {category.icon === "chain" && <svg viewBox="0 0 56 56" fill="none"><circle cx="17" cy="28" r="10" stroke="currentColor" strokeWidth="3" /><circle cx="39" cy="28" r="10" stroke="currentColor" strokeWidth="3" /><path d="M17 18h22M17 38h22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M24 17h8M24 39h8" stroke="#c1e65b" strokeWidth="5" strokeLinecap="round" /></svg>}
                {category.icon === "wheel" && <svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="3" /><circle cx="28" cy="28" r="4" fill="#c1e65b" stroke="currentColor" strokeWidth="2" /><path d="M28 8v16m0 8v16M8 28h16m8 0h16M14 14l11 11m6 6 11 11M42 14 31 25m-6 6L14 42" stroke="currentColor" strokeWidth="1.5" opacity=".55" /></svg>}
              </div>
              <div className="category-preview-copy"><span className="category-number">{category.number}</span><h3>{category.title}</h3><p>{category.detail}</p></div>
              <span className="category-status">CATALOG IN DEVELOPMENT</span>
            </article>
          ))}
        </div>
        <div className="library-section-action"><Link className="button button--dark" href="/guides">Browse guide previews <span aria-hidden="true">→</span></Link><span>Current examples are marked as drafts.</span></div>
      </section>

      <section className="safety-section" aria-labelledby="safety-title">
        <div className="page-shell safety-inner">
          <div className="safety-symbol" aria-hidden="true"><svg viewBox="0 0 56 56" fill="none"><path d="M28 6 47 13v13c0 11-7.8 19.1-19 24C16.8 45.1 9 37 9 26V13L28 6Z" stroke="currentColor" strokeWidth="2.6" /><path d="m19 28 6 6 13-14" stroke="#c1e65b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div className="safety-copy"><p className="eyebrow">CLARITY INCLUDES KNOWING WHEN TO STOP</p><h2 id="safety-title">Helpful guidance.<br /><span>Honest about its limits.</span></h2></div>
          <p className="safety-description">BikeFix will distinguish general guidance from system-specific procedures, preserve source references, and make it clear when a problem needs a qualified mechanic.</p>
        </div>
      </section>

      <section className="section page-shell request-section" id="request-a-guide" aria-labelledby="request-title">
        <div className="request-panel">
          <div className="request-decoration" aria-hidden="true"><span /><span /><span /></div>
          <div className="request-content">
            <p className="eyebrow">HELP SHAPE THE LIBRARY</p>
            <h2 id="request-title">Can&apos;t find the fix<br /><span>you&apos;re looking for?</span></h2>
            <p>Tell us which repair topic would make it easier to understand your bicycle. Requests are private, and they help the developer decide which guides to review and create next.</p>
            <Link className="button button--dark request-panel-cta" href="/request-repair-guide">Suggest a repair guide <span aria-hidden="true">→</span></Link>
            <div className="request-status"><span className="status-dot" /> No account or file upload required.</div>
          </div>
          <div className="request-mark" aria-hidden="true">
            <span className="request-mark-orbit request-mark-orbit--outer" />
            <span className="request-mark-orbit request-mark-orbit--inner" />
            <BicycleProfileIllustration type="mountain" className="request-bike-art" decorative />
          </div>
        </div>
      </section>

      <section className="foundation-note page-shell" aria-label="Development status">
        <span className="foundation-note-icon" aria-hidden="true">✳</span>
        <p><strong>You&apos;re looking at BikeFix v0.1.</strong> The explorer supports five bicycle variants, guided symptom checks, and a structured repair library. {GUIDE_CONTENT_SUMMARY.published} of {GUIDE_CONTENT_SUMMARY.total} canonical repair guides are currently approved for publication; draft guides are clearly labeled. Repair-request submissions remain disabled in production until the hosting, privacy, storage, access-control, and notification release gates are verified. See the deployment readiness checklist before enabling public submissions.</p>
      </section>
    </main>
  );
}
