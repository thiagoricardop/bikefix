# BikeFix security and privacy review — Phase 09

## Scope reviewed

Application configuration, public request endpoint, private file persistence, operator CLI, deployment environment, browser security headers, canonical SEO routes, and tests were inspected for Phase 09. This is an engineering review, not a penetration test, legal opinion, or external infrastructure audit.

## Controls implemented in application source

- Request payloads have a streamed 16 KiB cap, strict JSON/content-type handling, Zod validation, catalog-backed component allowlisting, same-origin checks when an Origin header is present, a honeypot, and UUID idempotency.
- Request records are persisted before any provider call. No public record-list/read route exists. API responses are not cacheable.
- The local rate limiter stores a keyed digest, not raw client IP. Production requires a single configured trusted client-IP header; the route validates one IPv4/IPv6 address and rejects comma-separated chains. The reverse proxy must strip/overwrite that header. The in-process limiter is not distributed.
- Production submissions fail closed until HTTPS origin, TLS termination, single-instance Node deployment, persistent storage, backup/restore, monitoring, trusted proxy, edge rate limiting, private operator access, audit log, approved retention/cleanup, and notification processing gates are configured.
- Filesystem request storage resolves the canonical path and rejects locations inside `public/`; on POSIX it uses restrictive file/directory modes. Windows requires explicit ACL review.
- Global security response headers and a static CSP are configured. Dynamic request/privacy pages receive a unique per-request nonce CSP and private no-store caching through the Next.js 16 Proxy convention.
- Production HSTS is emitted only when the app is in production, a valid HTTPS `SITE_URL` is configured, and `BIKEFIX_TLS_TERMINATION_CONFIRMED=true`.
- The deployment preflight avoids printing secret values and blocks while required configuration is incomplete.

## Known architectural constraints

- File-backed request storage and the in-process limiter support one self-hosted Node instance only. Multi-instance/serverless deployments are unsupported by this adapter.
- Environment attestation flags are not proof. Operator ACLs, edge behavior, backups, monitors, notification provider settings, TLS, and retention scheduler must be checked externally.
- The privacy notice must be reviewed against the actual selected jurisdiction, entity/contact details, provider terms, retention policy, and backup/mailbox copies before collecting production personal information. No legal jurisdiction or contact was invented here.
- No production domain/host has been selected. No external deployment, penetration test, security scan, restore, notification delivery, or uptime/alert exercise was performed in this task.
- Static-page CSP permits inline script blocks required by the statically rendered Next.js bootstrap but blocks inline script attributes and `eval` in production. Sensitive request/privacy routes use nonce CSP. Revisit the policy if analytics, third-party scripts, external fonts, or embeds are introduced.

## Release blockers

1. Choose and secure the canonical HTTPS domain and self-hosted Node host.
2. Verify TLS, reverse-proxy header stripping/rewriting, and edge rate limiting.
3. Verify one app instance, private persistent volume, filesystem ACLs, backup/restore, monitoring and alerts.
4. Approve the retention period and treatment of unresolved records; schedule and verify cleanup.
5. Approve operator identities/access, audit-log access and review process.
6. Decide and approve Resend/mailbox data processing, configure verified sender/destination, and test provider failure/retry.
7. Review and publish an accurate privacy notice with the actual operator contact/jurisdiction and retention terms.
8. Run all configured tests/builds and browser checks on the target OS/runtime and record evidence.
9. Obtain qualified mechanical review for all guide drafts before any are promoted to published content.

## No-go condition

Do not enable `REPAIR_REQUEST_*` production gates or announce production readiness until every blocker that applies to the chosen deployment has evidence. Do not call this review a penetration test or certify regulatory compliance.
