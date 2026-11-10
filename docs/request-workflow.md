# Request a Repair Guide — Workflow

## Purpose and status

The request flow is implemented for local development and for explicitly verified self-hosted Node deployments with persistent private filesystem storage. **Production submissions are fail-closed by default.** Do not enable them until the operator confirms the durable host/storage, approved retention and deletion policy, private operator access/audit, production edge rate limits, and notification provider configuration. Setting environment flags is an operator attestation, not automatic proof that these controls exist.

## Public entry points and form

The dedicated `/request-repair-guide` page is linked from the site header, mobile navigation, footer, homepage request panel, and guide-library help panel. The form includes a 5–120 character summary, a 20–3,000 character description, one of the five bicycle types or `unsure`, optional component selected from the domain catalog, optional attempted steps (up to 1,500 characters), and an optional email that is required only if the rider explicitly requests a reply. There are no accounts or uploads. A privacy notice is available at `/privacy`.

The form explains that requests are suggestions for future reviewed content, not personalized diagnostics or a guarantee of a response/new guide. Contact email is sent to the developer notification only when a reply is requested. When configured, the notification provider receives the summary, bicycle type, optional component, description, and attempted details; the primary store and provider/mailbox copies have separate deletion behavior. The request is not published publicly.

## Server validation and spam controls

`POST /api/repair-requests` accepts same-origin JSON only. It checks content type, a 16 KiB body cap, JSON shape, server-side Zod constraints and allowed domain component IDs. Cross-origin requests are rejected when an Origin header is present. A honeypot field and in-process rate limit (five per 15 minutes for a keyed digest of the client identifier) provide baseline anti-spam measures. Raw IP values are not persisted or logged. The in-process rate limiter is not distributed. In production, the API reads only the single header named by `REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER`, requires exactly one valid IPv4/IPv6 value, and rejects missing or comma-separated values. The trusted reverse proxy must strip any inbound instance of that header and overwrite it from the actual connection peer. Production must have this behavior and edge/WAF throttling verified before the trusted-proxy/rate-limit flags are set.

Each browser form instance creates a UUID idempotency key. The private store uses a short-lived filesystem lock for the key and returns the existing record on a repeat submission, preventing ordinary network retries from creating duplicate records. It never exposes record lookup through a public GET route. Invalid input, storage errors, oversized requests, cross-origin requests, rate limiting and missing production configuration produce errors without recorded-success messaging.

## Persistence and privacy

`FileRepairRequestStore` writes one JSON record per UUID into a private directory, using atomic temporary-file writes and best-effort `0700` directory / `0600` file permissions. On Windows, filesystem ACLs are the real security boundary; POSIX mode bits are not guaranteed to provide isolation there. `.data/repair-requests` is the local-development default and is gitignored. Use synthetic data in development.

For production, `REPAIR_REQUEST_STORAGE_DIR` must be an absolute path outside both the application root and `public/` on a persistent, access-controlled volume that survives application restarts and deployments. The application cannot prove that a path is backed by durable storage; an authorized operator must verify it and then set `REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED=true`. Do not use this adapter on ephemeral serverless storage. A future managed database adapter can implement the same storage interface after the hosting decision is approved.

There is no public list/read/export API for private submissions. File access is restricted to the designated operator accounts through host filesystem ACLs. Use the private CLI operations below rather than posting records to issues/chats. The private `operations-audit.jsonl` logs timestamp, operator identifier, action, record UUID and outcome only; it excludes request content and contact details. The audit log itself must be protected and backed up according to the approved operator policy.

## Record and notification semantics

1. The server validates, then durably writes a request with a UUID reference before contacting any email provider.
2. A storage failure returns an error and does not claim the request was recorded.
3. The notification adapter uses the Resend REST API only when `RESEND_API_KEY`, `REPAIR_REQUEST_NOTIFICATION_EMAIL` and `REPAIR_REQUEST_FROM_EMAIL` are configured. It sends the full request summary/details and includes contact email only when the rider explicitly asks for a reply. The Resend `Idempotency-Key` header uses the request UUID to mitigate duplicate notifications after short network retries; Resend documents a 24-hour idempotency window, so this is not an unlimited exactly-once guarantee ([provider documentation](https://resend.com/changelog/idempotency-keys)). Requests and notification payloads contain user-submitted content; production enablement requires the owner to accept the provider's processing/retention and email-copy implications.
4. A successful HTTP response sets `notificationStatus=accepted`, never `delivered`. A non-success response, missing configuration, or network error stores `failed` plus a compact error code. Notification failure never removes the saved request.
5. If notification state cannot be updated after persistence, the request remains recorded in `pending` state and the user is given that uncertainty honestly.
6. `REPAIR_REQUEST_OPERATOR_ID` is required for production operator operations; the CLI also fails closed until access-control and private audit-log confirmation flags are set. Keep credentials server-side and never include the description/email in email subject lines or routine logs.

Private operations from the project root:

- `npm run repair-requests:ops -- list` — show only request IDs, creation dates and statuses.
- `npm run repair-requests:ops -- show <UUID>` — display one private record in the authorized terminal; the operation is audited.
- `npm run repair-requests:ops -- export <UUID> --confirm` — write one record as JSON to stdout. Secure any redirected output and remove it when no longer needed.
- `npm run repair-requests:ops -- anonymize <UUID> --confirm` — replace summary/description, remove contact email and attempted details in the primary record, and suppress future notification retries. This does not erase emails or backup copies.
- `npm run repair-requests:ops -- delete <UUID> --confirm` — delete a record from the primary store. Provider mailboxes and backups are outside this command's control.
- `npm run repair-requests:ops -- set-status <UUID> <new|under_review|planned|published|declined> --confirm` — update triage status; the operation is audited and status changes never promote a guide record itself.
- `npm run repair-requests:retry-notifications` — retry failed/pending notifications. Requires the notification environment variables and sends real email; use test credentials/a destination in tests.
- `npm run repair-requests:expire` — retention dry run. `npm run repair-requests:expire -- --apply` deletes all records older than the configured policy, including unresolved records, and audits the operation. Destructive apply is refused unless the owner-approved retention and cleanup flags are set.

Operator access, export, anonymize/delete and retention operations require a stable `REPAIR_REQUEST_OPERATOR_ID`; audited events contain IDs and action outcomes only, not record content. Corrections are not exposed as a public API. A correction request must be handled by the designated operator through the private store under a controlled change procedure and recorded in the audit log. Operators must not silently alter the submitted meaning. The owner must approve who may perform these operations and must verify the host's account/audit controls before production.

## Production enablement gates

Submissions are disabled in `NODE_ENV=production` unless all of these are configured and externally verified:

- `SITE_URL` is the exact public HTTPS origin. `BIKEFIX_TLS_TERMINATION_CONFIRMED=true` only after public HTTPS and redirect behavior have been tested.
- `BIKEFIX_DEPLOYMENT_TARGET=self-hosted-node` and `BIKEFIX_SINGLE_INSTANCE_CONFIRMED=true`; the current file store and in-process rate limiter are not multi-instance/serverless components.
- `BIKEFIX_BACKUP_RESTORE_CONFIRMED=true` and `BIKEFIX_MONITORING_CONFIRMED=true` only after an actual restore test and production alerts are verified.
- `REPAIR_REQUEST_STORAGE_DIR` is an absolute path outside the application and `public/` directories, on a persistent private volume.
- `REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED=true` after verifying persistence/backup behavior.
- `REPAIR_REQUEST_RETENTION_APPROVED=true` and a valid `REPAIR_REQUEST_RETENTION_DAYS` (1–3650) after owner approval of the actual retention period and policy covering unresolved, planned, published and declined requests.
- `REPAIR_REQUEST_RETENTION_JOB_CONFIRMED=true` after a scheduled cleanup run has been tested and verified.
- `REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED=true`, `REPAIR_REQUEST_OPERATOR_ID` and `REPAIR_REQUEST_AUDIT_LOG_CONFIRMED=true` after authorized filesystem access and private audit-log behavior are verified.
- `BIKEFIX_TRUSTED_PROXY_CONFIRMED=true`, a safe `REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER` (for example `x-real-ip`) that the trusted proxy strips/overwrites with one address, and a cryptographically random `REPAIR_REQUEST_RATE_LIMIT_SECRET` of at least 32 characters; set `REPAIR_REQUEST_RATE_LIMIT_CONFIRMED=true` only after edge rate limiting and spoofed-header behavior are tested.
- `RESEND_API_KEY`, `REPAIR_REQUEST_NOTIFICATION_EMAIL`, `REPAIR_REQUEST_FROM_EMAIL`, and `REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED=true` after provider configuration and the owner’s approval of sharing submitted request details with Resend and the destination mailbox are verified.

On Windows, also require `BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED=true` after reviewing the actual NTFS permissions. The `npm run predeploy:check` script checks the configured gates and filesystem directory before release, but cannot independently prove remote host controls. The flags are not feature toggles to set speculatively: setting them allows live public submissions and sends notifications. The separate `REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED=true` attestation confirms the owner approved the provider/mailbox copy implications described in the privacy notice. `npm run repair-requests:expire` is a dry run by default; only a scheduled, verified job should run the `--apply` form.

## Retention policy decision — still open until owner approval

No legal or product retention period is inferred by this implementation. Before enabling production, the owner must explicitly approve a duration and acknowledge that this implementation deletes all primary records after that age, including unresolved ones; decide whether that is acceptable or adjust the implementation; decide how backups and email-provider copies are treated; confirm deletion/anonymization procedure; and publish the confirmed policy. `REPAIR_REQUEST_RETENTION_APPROVED` is an operator attestation that this exact policy was approved, not a substitute for the decision. While this decision is open, production submissions remain disabled.

## Verification

Automated tests use temporary directories and mocked notification providers; they must not send real emails. Required coverage: all six bicycle choices, schema/field limits, required email only for reply preference, unknown component rejection, idempotency, same-origin and honeypot checks, rate limiting, private file persistence/permissions, storage failure with no false success, notification accepted versus delivered semantics, recoverable notification failure, production fail-closed gates, operator commands, retention dry-run/apply, keyboard/mobile UX, and no public request read API. Production readiness additionally requires a real host with a persistent volume, approved policy, configured provider, external rate limiting and verified operator access/audit.
