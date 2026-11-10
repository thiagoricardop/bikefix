<div align="center">

# BikeFix

### Understand your bike. Find the right next step.

[![CI](https://img.shields.io/github/actions/workflow/status/YOUR-ACCOUNT/YOUR-REPOSITORY/ci.yml?branch=main&label=CI%20%2F%20tests&logo=githubactions&logoColor=white)](https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/YOUR-ACCOUNT/YOUR-REPOSITORY/pages.yml?branch=main&label=GitHub%20Pages&logo=githubpages&logoColor=white)](https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY/actions/workflows/pages.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-not%20selected-lightgrey)](docs/github-setup.md#licensing-and-public-release)

<img src="docs/assets/bikefix-hero.webp" alt="BikeFix concept illustration showing a bicycle with highlighted drivetrain, crankset and brake components" width="100%" />

*An approachable bicycle-care experience built around visual exploration, clear explanations and carefully reviewed repair guidance.*

<sub>Concept illustration for project identity only — not a bicycle service drawing or mechanical reference.</sub>

</div>

---

## What is BikeFix?

BikeFix is an early-stage bicycle education project designed to help riders understand the parts of their bicycle, make sense of common symptoms, and find an appropriate next step without needing to be an experienced mechanic.

The long-term idea is to bring bicycle discovery, cautious symptom guidance and practical repair education into one connected experience. A rider should be able to explore a bicycle, select a component, describe what they notice, and reach a relevant guide that explains the work in clear, manageable steps.

The planned signature experience is a library of short, visual repair tutorials. The product direction is to combine concise written instructions with original diagrams, component highlights and eventually hybrid 2D/3D animation. Animation is a means of explaining mechanical movement—not a substitute for verified procedures or qualified review.

> **Important:** BikeFix is a work in progress. The current repair-guide records are drafts. They are not approved repair procedures, and completing an on-screen checklist does not certify that a bicycle is safe to ride.

## Product experience

| Experience | What it does | Current status |
|---|---|---|
| **Bicycle explorer** | Explore road, mountain, hybrid, gravel and e-bike profiles; select components visually or through text navigation. | Implemented in source |
| **Component and symptom search** | Find relevant components and symptom references using local, deterministic search. | Implemented in source |
| **Guided diagnostics** | Follow curated question paths with compatibility checks and safety stop conditions. | Partial coverage; not a professional diagnosis |
| **Repair library** | Browse structured, source-linked repair-guide drafts with applicability notes and review status. | Eight drafts; qualified review pending |
| **Guide player** | Navigate steps, checkpoints, final checks and media fallbacks. | Implemented; production content still pending |
| **Request a guide** | Suggest a missing repair topic through a validated private server workflow. | Local development only; production disabled by default |
| **AI-assisted animation** | Create concise, reusable animated explanations for mechanical procedures. | Product direction; production pipeline not yet implemented |
| **Interactive 3D bicycle** | Potential future bicycle/component configurator connected to repair education. | Research idea; not part of the MVP |

## Why this approach?

Bicycle information is spread across manuals, manufacturer support pages, videos, forums and component-specific documentation. BikeFix aims to make the journey from *“What am I looking at?”* to *“What should I do next?”* less intimidating.

The principles behind the project are:

- **Visual first, not visual only.** Pair diagrams and interaction with readable text and accessible alternatives.
- **Honest uncertainty.** A symptom reference is not a confirmed diagnosis; unknown configurations stay unknown.
- **Safety before completion.** Critical symptoms and uncertainty should lead to a stop condition or professional inspection—not an invented answer.
- **Traceable content.** Sources, applicability, media rights and reviewer records must travel with each guide.
- **Human-reviewed procedures.** AI can help draft, structure and animate content, but it cannot approve mechanical instructions.
- **Useful without AI credentials.** The core application is designed to run without an AI provider or API key.

## Current project status

BikeFix is a **pre-release prototype**, not a production service.

- The current application foundation and interactive bicycle profiles are present in the repository.
- The guide catalog contains eight structured, source-linked drafts.
- No qualified mechanic reviewer/date is recorded for the initial guide set; none should be described as mechanically approved or published.
- Player-only fixtures are used by tests and are not part of the public guide catalog.
- The server-side repair-request workflow is fail-closed until the required hosting, storage, privacy, retention, operator-access, rate-limit and notification controls are verified.
- Automated CI and GitHub Pages deployment are provided, but their badges show **actual workflow status only after the workflows have run**. A workflow file in the repository is not evidence of passing checks or a live deployment.

## Technology

- **Application:** Next.js App Router, React and TypeScript
- **Styling:** Tailwind CSS 4 and project-specific CSS tokens
- **Domain model:** typed bicycle, component, symptom, diagnostic and repair-guide catalogs
- **Validation:** Zod and cross-catalog integrity checks
- **Tests:** Vitest, React Testing Library and Playwright
- **Automation:** GitHub Actions for quality checks and the separate static Pages preview

## Run locally

> Before the first push, replace `YOUR-ACCOUNT/YOUR-REPOSITORY` in the clone URL and workflow badge links with the actual GitHub owner and repository name. The badges will then report the real CI and Pages workflow results.

### Requirements

- Node.js **22.12 or later**
- npm (the committed `package-lock.json` is the dependency source of truth)

### Setup

```bash
git clone https://github.com/thiagoricardop/bikefix.git
cd YOUR-REPOSITORY
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The normal development command includes a small compatibility wrapper for the Google AI Studio preview environment. You can also run the server directly with `npx next dev --port 3000 --hostname 0.0.0.0` when required by your environment.

### Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For the browser suite, install Chromium once and run the production-server E2E tests:

```bash
npx playwright install chromium
npm run test:e2e
```

CI runs the same sequence and reuses the production build for browser tests. Do not mark a check as passing unless its workflow or local command completed successfully.

## Deployment options

### GitHub Pages — static preview without server-side services

A dedicated workflow is included at [`.github/workflows/pages.yml`](.github/workflows/pages.yml). It builds and deploys a static preview when changes reach `main` (and builds without deploying on pull requests).

**The GitHub Pages version is intentionally a static preview without server-side services.** GitHub Pages serves static files; it does not run the BikeFix Node.js API, the private filesystem request store, the dynamic security proxy, the server-side response-header policy or the request-submission workflow. The client-side bicycle explorer and diagnostic wizard remain interactive, but no server services or private request data are available. The Pages build omits server-only code and shows a clear disabled state instead of a request form. Diagnostic query-string preselection is not retained in the static preview. Draft player fixtures are excluded from the static public routes.

To enable it:

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Push to `main` or run the **GitHub Pages** workflow manually on `main`.
5. Open the published URL shown by the workflow's `github-pages` environment.

For a project site, the workflow detects the repository name and sets the base path automatically. To build locally, set `GITHUB_REPOSITORY=OWNER/REPOSITORY` and run `npm run build:github-pages` (PowerShell: `$env:GITHUB_REPOSITORY="OWNER/REPOSITORY"`). For a custom domain or a non-standard path, configure the optional repository Actions variables `BIKEFIX_PAGES_SITE_URL` (HTTPS origin only) and `BIKEFIX_PAGES_BASE_PATH` (empty for a root/custom domain, or e.g. `/bikefix`).

On GitHub Free, Pages requires a public repository. A published Pages site is publicly available even when the source repository is private on a plan that supports private Pages. Review the repository contents and intended audience before enabling it.

### Full application — Node.js hosting

To run the complete app, use a Node.js host that supports the Next.js server runtime. The current request workflow uses private filesystem persistence and an in-process rate limiter; its release runbook currently assumes a single self-hosted Node.js instance with a persistent private volume. Do not deploy the request workflow to GitHub Pages or an ephemeral serverless filesystem.

See [`docs/deployment.md`](docs/deployment.md) and [`docs/request-workflow.md`](docs/request-workflow.md) before enabling real submissions. The preflight deliberately blocks until its deployment gates are attested and verified.

## Repository map

```text
.
├── .github/
│   ├── agents/                 # Specialized GitHub Copilot agent guidance
│   └── workflows/              # CI and static GitHub Pages deployment
├── docs/
│   ├── assets/                 # README and project illustrations
│   ├── architecture.md         # Application boundaries and design decisions
│   ├── content-guidelines.md   # Editorial and mechanical-review rules
│   ├── deployment.md           # Node.js release runbook
│   ├── guide-review-checklist.md
│   ├── request-workflow.md
│   └── security-review.md
├── public/                     # Approved static application assets
├── scripts/                    # Local tooling and deployment helpers
├── src/
│   ├── app/                    # Next.js routes and page layouts
│   ├── components/             # Explorer, diagnostic and guide UI
│   ├── data/                   # Typed bicycle and repair content catalogs
│   ├── lib/                    # Search, diagnosis, validation and server services
│   └── types/                  # Shared domain types
└── tests/
    ├── components/
    ├── e2e/
    └── unit/
```

## Safety and content policy

BikeFix is educational software, not a substitute for a qualified bicycle mechanic. The project must not invent torque values, compatibility facts or manufacturer-specific service procedures. A guide may only progress through the editorial lifecycle when its technical scope, authoritative sources, media permissions, safety stop conditions and qualified review evidence are documented.

Do not publish AI-generated mechanical instructions without qualified human review. Do not copy or rehost third-party videos, manuals, illustrations or other creative works without appropriate permission or a valid licence. Public source availability does not grant reproduction rights.

## Contributing

Before changing the project, read [`AGENTS.md`](AGENTS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), the relevant architecture note and the tests for the area being changed. Keep changes focused, add tests for behavior, preserve the safe draft/review status of guide content and never commit secrets or real repair-request records.

## Documentation

- [Product goals](docs/product-goals.md)
- [Architecture](docs/architecture.md)
- [Acceptance criteria](docs/acceptance-criteria.md)
- [Architecture decision log](docs/decision-log.md)
- [Content guidelines](docs/content-guidelines.md)
- [Qualified mechanical review checklist](docs/guide-review-checklist.md)
- [Request workflow](docs/request-workflow.md)
- [Security review](docs/security-review.md)
- [Node.js deployment runbook](docs/deployment.md)
- [GitHub setup](docs/github-setup.md)
- [Repository audit and cleanup](docs/repository-audit.md)

## Project maturity

BikeFix is actively being evaluated and built. Features, content and deployment claims must be based on verified behavior. The next meaningful milestones are repeatable CI, qualified review of pilot content, a production-safe storage/hosting choice, and validation with beginner cyclists and mechanics.

---

<div align="center">

**BikeFix** · Know your bike. Find the right next step.

<sub>Early-stage project · Not a certified repair resource</sub>

</div>
