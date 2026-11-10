# Architecture

## Current implementation

BikeFix is a Next.js App Router application using React, strict TypeScript and Tailwind CSS 4. The repository also includes deterministic domain services, structured catalog data, unit/component tests and Playwright browser tests.

## Application boundaries

1. **Presentation:** accessible routes, reusable UI components, responsive layouts and original interactive SVG bicycle profiles.
2. **Domain data:** bicycle types, component definitions, symptom references, diagnostic rules and repair-guide records.
3. **Application logic:** catalog validation, component/symptom search, compatibility filtering, deterministic diagnostic branching and guide selection.
4. **Data access:** private repair-request persistence through a filesystem adapter for local development and an explicitly verified single-instance self-hosted Node.js deployment.
5. **External services:** optional developer notification and future AI services, isolated behind server-side modules.

Keep domain data separate from SVG geometry and UI. Maintain a text alternative to diagram interaction. Search and basic browsing must work without an AI API key.

## Bicycle explorer

The explorer supports representative road, mountain, hybrid/commuter, gravel and e-bike SVG profiles. Interactive regions map to stable domain component IDs. A bicycle type is a broad configuration cue, not proof of exact model, component or service compatibility.

## Search and diagnostics

Search is local and deterministic. The diagnostic wizard follows explicitly curated question branches and returns conservative outcomes. It is not an AI diagnosis, does not claim certainty, and must preserve unknown states and safety stops. Only guide records that satisfy the content publication gate may be recommended as repair procedures.

## Repair guides and content lifecycle

Repair guides are structured records with applicability, tools, prerequisites, warnings, steps, checkpoints, final checks, stop conditions, source IDs, media rights/provenance and review metadata. Test fixtures are kept separate from the canonical public catalog and must not be exposed as user-facing routes.

The initial eight catalog records are drafts. Linked source material is not equivalent to qualified mechanic review. A guide must not be marked reviewed or published without an actual qualified reviewer, date, technical scope review, safety review and evidence recorded under `docs/guide-review-checklist.md`.

## Repair-request workflow

The full Node.js app includes a server-side request endpoint, server validation, private file-per-record storage and optional Resend notification. The current storage/rate-limit design assumes a single self-hosted Node instance with a persistent private volume and appropriate edge protections. Production submissions remain fail-closed until all gates in `docs/request-workflow.md` and `docs/deployment.md` are verified.

## Deployment profiles

### Full application

Use a compatible Node.js host running the Next.js server. This is required for the API route, filesystem persistence, dynamic privacy/request pages and proxy-based security headers.

### GitHub Pages preview

GitHub Pages is static hosting. `scripts/build-github-pages.mjs` creates an isolated temporary build copy, removes the API/proxy paths, replaces request and privacy pages with static versions, and performs a Next.js static export with the correct repository base path. The deployment is a static preview without server-side services, not the full application. Client-side explorer and diagnostic interactions remain available, but request-time query-parameter preselection is not retained and the Next.js response-header/proxy policy is not applied by GitHub Pages. The source tree used by Node.js hosting is not rewritten by this process.

## Future integrations

An AI assistant, animated tutorial pipeline and 3D bicycle configurator are possible future extensions, not current runtime requirements. Any AI output must remain subordinate to approved source material and qualified mechanical review. Add external providers only after a concrete user need and rights/security review are established.
