import type { Metadata } from "next";
import Link from "next/link";
import { getRepairRequestWorkflowConfig } from "@/lib/repair-requests/config";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How BikeFix handles repair-guide suggestions and optional contact information.",
  ...(getCanonicalUrl("/privacy") ? { alternates: { canonical: getCanonicalUrl("/privacy") } } : {}),
};

export default function PrivacyPage() {
  const config = getRepairRequestWorkflowConfig();
  return (
    <main id="main-content" className="privacy-page page-shell">
      <p className="request-back-link"><Link href="/request-repair-guide">← Back to guide requests</Link></p>
      <header className="request-page-heading">
        <p className="eyebrow">PRIVACY</p>
        <h1>Your request stays<br /><span>out of the public library.</span></h1>
        <p>This notice explains the intended handling of information submitted through BikeFix&apos;s repair-guide request form.</p>
      </header>
      <article className="privacy-content">
        <section><h2>What the form collects</h2><p>A guide request can include a short topic summary, a description of the problem, bicycle type, an optional component, and optional information about what you have tried. An email address is collected only when you check the box asking for a reply.</p></section>
        <section><h2>Why it is used</h2><p>The BikeFix developer uses these details to consider future repair-guide topics. If you ask for a reply, the provided email may be used to follow up about that request. A reply or new guide is not guaranteed. The form is not a diagnostic or emergency service.</p></section>
        <section><h2>Private storage and notifications</h2><p>Requests are stored in the server&apos;s private request store and are not publicly listed or exposed through a public request lookup API. When developer notifications are configured, the notification provider (Resend) receives the submitted summary, bicycle type, optional component, description, and optional attempted steps. The contact email is included only when you request a reply. This means the provider may process a copy of those request details under its own service terms and retention practices. The primary-store deletion command cannot delete messages already sent to mailboxes or provider records. An email provider accepting a notification does not prove that it was delivered to the recipient&apos;s mailbox.</p></section>
        <section><h2>Retention and deletion</h2>{config.mode === "self-hosted-configured" && config.retentionDays ? <p>This deployment is configured to retain request records for no longer than {config.retentionDays} days, including unresolved requests. Its operator has attested that this treatment and the cleanup process are part of the approved policy. Deletion from the primary request store does not necessarily mean copies in provider logs or backups are immediately removed.</p> : <p>Production request submissions are disabled until an explicit retention period, treatment of unresolved requests, deletion procedure, and cleanup process are approved and configured. In local development, use synthetic test data only; local test records must be removed by the developer and are not covered by a production retention schedule.</p>}</section>
        <section><h2>Your choices</h2><p>You can leave the email field blank unless you ask for a reply. Do not submit passwords, payment details, precise location, or other sensitive information. Requests are private and are not automatically published as public issues or content.</p></section>
        <section><h2>Current deployment status</h2><p>{config.enabled ? "The request workflow is enabled in this environment." : "The request workflow is currently disabled in this deployment, and submissions to it are not saved."} If you have a privacy question, do not include sensitive details in a public issue or URL.</p></section>
      </article>
      <p className="request-page-privacy-link"><Link href="/request-repair-guide">Return to the guide request form →</Link></p>
    </main>
  );
}
