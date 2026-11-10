# BikeFix deployment runbook

> GitHub Pages is supported only as a static preview without server-side services. It does not run the API, proxy, request persistence or server-side notification, and it cannot apply the Next.js server response-header policy. See [GitHub setup](github-setup.md#github-pages-deployment). The full app requires the Node.js deployment described below.

## Release status

Phase 09 implements the application-level hardening and release checks, but no hosting provider, public domain, persistent volume, edge proxy, monitoring service, backup target, legal retention policy, or production deployment has been selected or verified. **Do not describe this repository as production-deployed or enable public repair-request submissions yet.** The `predeploy:check` command is intentionally fail-closed.

The current request store is a private filesystem adapter and the rate limiter is in-process. This release therefore supports one self-hosted Node.js application instance with a persistent private volume. Do not deploy it to an ephemeral serverless filesystem or run multiple web instances against the same file store. A multi-instance deployment requires a separately reviewed shared persistence and distributed rate-limit adapter.

## Supported application runtime

- Node.js 22.12 or later, matching `package.json`.
- npm with the committed `package-lock.json`; install with `npm ci`.
- One self-hosted Node.js process (`next start`) behind a reverse proxy that terminates HTTPS.
- Persistent, private filesystem volume for repair requests, outside both the application root and `public/` directory.
- Application assets are local; no external font/image CDN is required.

## Build and test before release

Run from the project root on the same OS/runtime family as the target deployment:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright script builds first and starts the production server. Stop any existing service using the configured port before running it. Run the full set after every production dependency or runtime change. `npm audit --omit=dev` can provide a production-dependency vulnerability snapshot when the npm registry is available; record the date and the full output. A zero-vulnerability result is not a substitute for dependency maintenance or an application security review.

## Required environment

Set production variables through the host's secret manager or protected service environment, never commit them. `.env.example` is a reference only and is not a production configuration.

### Public site and host attestations

- `NODE_ENV=production`
- `SITE_URL=https://<actual-public-host>` — exact HTTPS origin only, no path/query/credentials. Set this during `next build` so static metadata has the right canonical base.
- `BIKEFIX_DEPLOYMENT_TARGET=self-hosted-node`
- `BIKEFIX_TLS_TERMINATION_CONFIRMED=true` only after HTTPS, certificate renewal, and HTTP-to-HTTPS redirect are verified at the public edge.
- `BIKEFIX_TRUSTED_PROXY_CONFIRMED=true` only after the reverse proxy strips client-supplied forwarding headers and writes the canonical client IP from the connection peer.
- `BIKEFIX_SINGLE_INSTANCE_CONFIRMED=true` only while exactly one app instance handles this filesystem-backed workflow.
- `BIKEFIX_BACKUP_RESTORE_CONFIRMED=true` only after a protected backup and restore exercise has been completed.
- `BIKEFIX_MONITORING_CONFIRMED=true` only after process, disk, volume, backup, and notification-failure monitoring/alerts are active.

### Repair request workflow

Use the complete variable list and decision notes in `docs/request-workflow.md`. At minimum, production requires:

- `REPAIR_REQUEST_STORAGE_DIR` as an absolute directory outside the application and `public/` directories, on the persistent private volume. Create it before preflight and restrict access to the service account and approved operators.
- `REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED=true` after restart/redeploy persistence is observed.
- `REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER` naming one header (for example `x-real-ip`) that the reverse proxy strips and overwrites with exactly one validated IPv4/IPv6 address. The app rejects a missing, malformed, or comma-separated value in production.
- `REPAIR_REQUEST_RATE_LIMIT_CONFIRMED=true` and a cryptographically random `REPAIR_REQUEST_RATE_LIMIT_SECRET` of at least 32 characters, plus a tested edge/WAF rate limit. The in-process limiter is only an additional per-process safeguard.
- `REPAIR_REQUEST_RETENTION_APPROVED=true`, an owner-approved `REPAIR_REQUEST_RETENTION_DAYS` from 1 through 3650, and `REPAIR_REQUEST_RETENTION_JOB_CONFIRMED=true` after the scheduled cleanup process is verified.
- `REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED=true`, `REPAIR_REQUEST_AUDIT_LOG_CONFIRMED=true`, and `REPAIR_REQUEST_OPERATOR_ID` after host ACLs, operator authorization, and audit review are approved and tested.
- Resend credentials/destination/sender plus `REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED=true` only after the owner approves that the submitted request details are sent to Resend and the destination mailbox.

Do not set these attestations speculatively. In particular, changing the last flag can enable public submissions and transmit personal request details to the configured provider.

## Reverse proxy requirements

The trusted proxy must:

1. Accept public HTTPS only and redirect HTTP to HTTPS.
2. Remove any inbound client-IP header used by `REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER`.
3. Set that header from the actual TCP peer/validated upstream chain, containing exactly one IP address.
4. Apply a request-rate and body-size limit at the edge (the app body limit is 16 KiB).
5. Forward the original host/protocol safely and restrict direct access to the Node listener from the public internet.

Do not trust a browser-supplied `X-Forwarded-For` or `X-Real-IP` value without the above proxy behavior. Verify this with a spoofed-header test on staging before enabling submissions.

## Security headers and content policy

`next.config.ts` applies a global CSP and defensive response headers. The static page CSP allows Next's build-generated inline bootstrap scripts but blocks inline event-handler attributes, objects, framing, and `eval` in production. The dynamic `/request-repair-guide` and `/privacy` pages use `src/proxy.ts` to apply a fresh nonce CSP and `private, no-store` response caching. These routes are dynamic because Next.js extracts the nonce from the request CSP during rendering. Other pages remain statically renderable for public performance and SEO.

Do not add third-party scripts, analytics, embedded content, remote fonts, or media without reviewing and intentionally updating CSP directives. Do not weaken production policy with `unsafe-eval`. HSTS is sent only when the app is in production, `SITE_URL` is a valid HTTPS origin, and `BIKEFIX_TLS_TERMINATION_CONFIRMED=true`; set that attestation only after testing the actual public TLS edge and redirect. Review subdomain ownership before adding `includeSubDomains` or preload.

## SEO behavior

- `SITE_URL` is the source for canonical URLs and `metadataBase`.
- `/robots.txt` fails closed with `Disallow: /` when no valid HTTPS `SITE_URL` is configured.
- `/sitemap.xml` is empty without a configured canonical origin.
- Sitemap includes the homepage, public privacy notice, and only guides whose review, source, and media-rights evidence allow publication.
- Symptom diagnostics, request form, content inventory, and guide drafts are marked `noindex`.
- Draft guides remain accessible to users through direct links; noindex is not a substitute for access control. The inventory is operational editorial content, not a private record store.

## Preflight

Load the exact release environment variables, then run:

```bash
npm run predeploy:check
```

The script checks environment completeness, supported runtime, storage directory location/accessibility/permissions, and operator/retention/notification attestations. On Windows, also set `BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED=true` only after reviewing the actual NTFS ACLs. The command must exit non-zero while a critical gate is missing.

This is a configuration preflight, not a deployment, legal review, penetration test, independent proof of infrastructure, or external provider verification.

## Deploy and post-deploy verification

After the preflight passes and the owner explicitly authorizes release:

1. Build from a clean checkout with the exact release environment.
2. Start one Node process with `npm run start` behind the verified reverse proxy.
3. Verify `/`, `/guides`, `/diagnose`, `/request-repair-guide`, `/privacy`, `/robots.txt`, and `/sitemap.xml` over the public HTTPS origin.
4. Check response headers, canonical tags, noindex state, and that draft guides are absent from the sitemap.
5. Submit a synthetic request in a controlled staging environment; verify durable persistence before notification, provider acceptance wording, private operator read/audit, notification retry, anonymization/deletion, backup/restore, and retention cleanup.
6. Test cross-origin rejection, spoofed IP header handling, edge throttling, oversized bodies, storage unavailability, provider outage, and no public read endpoint.
7. Verify alerts and retain the release evidence. Do not use real personal data for staging tests.

No step above should be marked complete until it has been performed on the actual deployment target.
