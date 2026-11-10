# Repository audit and cleanup

## Audit scope

Reviewed the supplied BikeFix Phase 09 source archive, its Next.js application, data catalogs, test suites, documentation, scripts and existing GitHub configuration. The goal was to retain files needed to understand, build, test, maintain and deploy the project while removing generated, temporary or obsolete scaffolding.

## Retained

- The Next.js application, domain catalogs, deterministic search/diagnostic logic and repair-guide player.
- Unit, component and Playwright test suites.
- Product goals, architecture, acceptance criteria, decision records, content/safety rules, deployment and request-workflow runbooks.
- The specialized GitHub Copilot agent guidance and pull-request template.
- The package lockfile and development/deployment scripts.

## Removed or consolidated

- Generated repository tree listing (`TREE.txt`).
- Internal phase prompt index and implementation plan (`PROMPTS.md`, `PLANS.md`) and the temporary `harness/` phase/build-log archive. Current product and engineering requirements remain in `docs/`.
- Repetitive folder-level README files that duplicated the root README or architecture documentation.
- Empty `.gitkeep` placeholders and unimplemented empty directory scaffolds.
- Large historical desktop/mobile review screenshots and temporary HTML comparison output. The textual audit history, design specification and vector target board are retained.
- Old references to removed phase files and screenshot paths were updated.

## Correctness and release improvements

1. **Test fixture route exposure fixed.** The guide route registry previously combined the canonical guide catalog with player-only test fixtures. It now exposes only canonical catalog records; fixtures remain available to component/unit tests. The browser suite now checks that fixture slugs are not public routes.
2. **GitHub Pages path support added.** Canonical URLs, sitemap and robots output support a project-site base path.
3. **Static Pages export separated from the full application.** The build helper stages a temporary copy and removes the Node-only API/proxy path, replaces dynamic request/privacy screens with static alternatives, and exports the static pages preview. The source app and its Node.js request flow are not mutated by the build process.
4. **CI build duplication removed.** CI builds once and then runs Playwright against that production build.
5. **Maintenance automation added.** Dependabot is configured for npm dependencies and GitHub Actions.
6. **Professional repository docs added.** Root README, contributing guide, security reporting guidance, and this audit are now in place.

## Deployment truth

GitHub Pages can host only the exported static preview without server-side services. It cannot run the Next.js Proxy, POST request API, server-side filesystem storage or notification flow. The full application still requires a compatible Node.js host. See `architecture.md`, `github-setup.md` and `deployment.md`.

## Verification performed for this cleanup

- `node --check` passed for `scripts/build-github-pages.mjs`, `scripts/aistudio-dev.mjs`, `scripts/deployment-preflight.mjs` and `scripts/repair-request-ops.mjs`.
- GitHub Actions CI and Pages workflow YAML parsed successfully. Dependabot YAML parsed successfully.
- The Pages builder staging smoke test passed with a stub Next.js CLI: it verified that the temporary build omits the API/proxy, replaces request/privacy/dynamic-diagnosis pages, uses the repository base path, excludes player fixtures from the public registry, and copies the expected artifact files. This did **not** run Next.js compilation or a true static export.
- Removed-file reference scan found no remaining references to the deleted harness, phase-plan, tree-listing, old screenshot, or deleted source README files.
- A clean `npm ci` attempt did not finish before the environment timeout. It left an incomplete dependency tree, which was removed from the final package. As a result, lint, TypeScript, unit/component tests, Next production build, Playwright execution and the static Pages export could not be rerun in this environment. The GitHub Actions workflows are configured to perform those checks after upload.

## Open release gates

- Run all CI checks on GitHub and resolve failures.
- Confirm the static Pages export completes and inspect the deployed preview paths.
- Obtain qualified mechanic review before describing any repair guide as approved or published.
- Keep production repair-request submission disabled until every operational and privacy gate in the runbooks is verified.
- Choose an appropriate project licence before inviting public reuse or accepting external contributions.
