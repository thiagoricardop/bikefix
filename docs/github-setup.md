# GitHub repository setup

## Before publishing

Review every file and confirm ownership/licensing for the code, illustrations, screenshots, documentation excerpts and any third-party assets. This repository deliberately has no `LICENSE` because the owner has not selected a public reuse grant. No license means third parties should not assume permission to copy, modify, redistribute or commercially reuse the project.

For initial source-code review, a private repository is appropriate. **GitHub Pages itself publishes a public website.** On GitHub Free, Pages requires a public repository; paid plans can support private source repositories, but the published site remains publicly accessible unless private Pages visibility is separately configured and available. Review the audience and repository contents before enabling Pages.

## Upload the complete project

From a terminal opened in the repository folder:

```bash
git init -b main
git add .
git status --short
git commit -m "Prepare BikeFix project for GitHub"
```

Check that `.env.local`, `node_modules`, `.next`, `.data`, real request records and test output are not staged. Then create an empty repository on GitHub and connect it:

```bash
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

## Continuous integration

`.github/workflows/ci.yml` runs the locked install, lint, TypeScript check, unit/component tests, production build and Playwright browser suite on pushes and pull requests. The status badges in `README.md` link to these real workflow results. A workflow definition is not evidence of a passing result; check the first run after pushing.

## GitHub Pages deployment

`.github/workflows/pages.yml` builds a separate static preview without server-side services and deploys it through GitHub Actions.

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Push to `main` or run the workflow manually on `main`.

The workflow derives the repository path automatically for project pages. Optional repository Actions variables:

- `BIKEFIX_PAGES_SITE_URL`: HTTPS origin only, e.g. `https://example.com`.
- `BIKEFIX_PAGES_BASE_PATH`: empty for root/custom-domain hosting, or `/repository-name` for a path-based deployment.

GitHub Pages serves static HTML, CSS and JavaScript files. On GitHub Free, the source repository must be public; a published Pages site is publicly accessible. See the [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [site creation requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site). Next.js static export does not support request-time Route Handlers, Proxy, response headers or other server-only features; see the official [Next.js static export guide](https://nextjs.org/docs/app/guides/static-exports). GitHub Pages therefore cannot run the BikeFix API, private request persistence, or the Node application’s server response-header policy. The Pages build removes server-only code from its temporary build copy, replaces the guide-request form with a disabled message and includes a static privacy notice. It excludes player-only test fixtures from the public static routes. Use a compatible Node.js host for the full application.

## Environment files and secrets

- Commit `.env.example`; it contains placeholders and safe defaults only.
- Create `.env.local` for local development. Never commit it.
- Keep production API keys, private storage paths, personal data and real repair requests out of source control, README files, issues and pull requests.
- If a secret is committed, revoke or rotate it with the provider immediately. Deleting it in a later commit does not invalidate the exposed credential.

## Before a production launch

A green CI or Pages workflow is not production approval. Review:

- `docs/deployment.md`
- `docs/security-review.md`
- `docs/request-workflow.md`
- `docs/guide-review-checklist.md`

The repair-request workflow requires verified durable private storage, operator access controls, auditability, retention/deletion, backup/restore, monitoring, trusted edge rate limiting and explicit approval of notification data processing. All initial repair guides remain drafts pending qualified review.
