# Acceptance Criteria

These are product-level criteria. Individual phases must select the criteria in scope and add precise tests.

## Explorer and bicycle variants
- [ ] All five bicycle types are selectable: road, mountain, hybrid/commuter, gravel, and e-bike.
- [ ] An unsure/other route remains available.
- [ ] Each variant has an appropriate original or properly licensed SVG with distinct selectable component regions.
- [ ] Selecting a region highlights the component and updates contextual details.
- [ ] Component, symptom, and guide references resolve to valid records.
- [ ] Switching variants preserves a selection only when it remains valid.
- [ ] Optional or absent components are not shown as guaranteed to exist.
- [ ] Users can navigate the component tree without relying on SVG interaction.
- [ ] Keyboard, touch, and screen-reader-accessible alternatives are available.

## Search and diagnosis
- [ ] Users can search symptoms directly without selecting a bicycle component.
- [ ] Filters and results remain useful without AI credentials.
- [ ] Supported diagnostic branches have tests.
- [ ] Uncertain diagnoses are not presented as confirmed causes.
- [ ] Recommendations account for known component compatibility.

## Repair guides and media
- [ ] The initial eight target topics exist as canonical structured records with stable identifiers and source references.
- [ ] Each guide records relevant source applicability, bicycle/component/symptom links, and truthful review status.
- [ ] The content inventory distinguishes draft, in-review, qualified-reviewed, published, sourced, and blocked states.
- [ ] A qualified mechanic review is recorded only after it actually occurs; reviewer/date fields are not fabricated.
- [ ] Publication status requires resolved source links, real review evidence, and complete rights evidence for attached media.
- [ ] Each guide records relevant sources and review status.
- [ ] Users can navigate steps, inspect prior steps, and use checkpoints.
- [ ] Media failure does not block essential written instructions.
- [ ] Safety-critical guidance has actionable warnings and escalation criteria.
- [ ] Completion of a checklist is not represented as proof of bicycle safety.

## Request a repair guide
- [ ] Request form is reachable from an obvious help entry point and relevant empty states.
- [ ] Summary and description are validated; bicycle type supports all five variants plus unsure.
- [ ] Contact email is optional unless the user requests a reply.
- [ ] Server-side validation and suitable spam controls are implemented.
- [ ] A successful request is durably stored and assigned a reference.
- [ ] Developer notification uses server-side configuration and has failure handling.
- [ ] Persistence failure never produces a false success message.
- [ ] Notification failure after persistence does not lose the request or falsely claim email delivery.
- [ ] Notification statuses distinguish queued/accepted from confirmed delivery when provider evidence permits; labels never overstate what occurred.
- [ ] Request records are private and protected by server-side access controls.
- [ ] The privacy notice accurately explains collection, contact-data use, processors, and the actual workflow.
- [ ] An explicit retention period and deletion/anonymization procedure are approved and documented before production submissions are enabled.
- [ ] Retention/deletion behavior is tested, or a controlled operational procedure is documented and verified; backup-retention limitations are disclosed where relevant.
- [ ] Keyboard and mobile interactions are usable.

## Quality and deployment
- [ ] Setup and environment requirements are documented.
- [ ] Public pages have explicit titles, descriptions, canonical URLs (when SITE_URL is configured), and truthful robots directives.
- [ ] Sitemap includes only indexable public content; drafts and operational pages are not promoted into it.
- [ ] Security headers and CSP are applied; sensitive request/privacy pages receive a per-request nonce CSP and no-store caching.
- [ ] Production request handling trusts only one client-IP header that a configured reverse proxy strips and overwrites.
- [ ] Production request workflow is fail-closed until TLS, single-instance storage, persistence, backups, monitoring, retention, operator access/audit, trusted rate limiting, and notification processing are verified.
- [ ] A deployment preflight reports missing gates without printing secrets.
- [ ] Responsive, keyboard, reduced-motion, landmark, and labeled-form checks are represented in browser tests.
- [ ] Relevant tests, lint/type checks, and production build are executed and recorded.
- [ ] Critical end-to-end user journeys are tested where tooling permits.
- [ ] No unverified feature is described as complete.
