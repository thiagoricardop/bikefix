import type { Metadata } from "next";
import Link from "next/link";
import { RepairGuideRequestForm } from "@/components/request-form/repair-guide-request-form";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { getRepairRequestWorkflowConfig } from "@/lib/repair-requests/config";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Request a repair guide",
  description: "Suggest a bicycle repair topic for future BikeFix guides.",
  robots: { index: false, follow: true },
  ...(getCanonicalUrl("/request-repair-guide") ? { alternates: { canonical: getCanonicalUrl("/request-repair-guide") } } : {}),
};

export default function RequestRepairGuidePage() {
  const config = getRepairRequestWorkflowConfig();
  const components = BICYCLE_COMPONENTS.map(({ id, name }) => ({ id, name }));
  return (
    <main id="main-content" className="request-page page-shell">
      <p className="request-back-link"><Link href="/#request-a-guide">← Back to BikeFix</Link></p>
      <header className="request-page-heading">
        <p className="eyebrow">HELP SHAPE THE REPAIR LIBRARY</p>
        <h1>What would help you<br /><span>feel confident about your bike?</span></h1>
        <p>Suggest a missing repair topic. Specific observations help the BikeFix developer understand what guide could be useful next.</p>
      </header>
      {config.mode === "local-development" && <p className="request-development-note">Development mode: submissions are written to a private local server directory for testing. Use synthetic information only; local development storage is not a production service.</p>}
      <section className="request-page-card" aria-labelledby="request-form-heading">
        <div className="request-form-card-heading">
          <div><p className="eyebrow">GUIDE SUGGESTION</p><h2 id="request-form-heading">Tell us what you need</h2></div>
          <span className="request-form-badge">No account needed</span>
        </div>
        <RepairGuideRequestForm enabled={config.enabled} disabledMessage={config.disabledReason} components={components} />
      </section>
      <aside className="request-page-safety">
        <span aria-hidden="true">i</span>
        <p>This form is for suggesting future educational content, not reporting an emergency or requesting a guaranteed diagnosis. If the bicycle may be unsafe to ride, stop using it and ask a qualified bicycle mechanic to inspect it.</p>
      </aside>
      <p className="request-page-privacy-link">Before submitting, read how requests are handled in the <Link href="/privacy">BikeFix privacy notice</Link>.</p>
    </main>
  );
}
