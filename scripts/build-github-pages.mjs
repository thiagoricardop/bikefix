import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = process.env.GITHUB_REPOSITORY ?? "";
const [owner = "", repositoryName = ""] = repository.split("/");
const isAccountSite = owner && repositoryName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const inferredBasePath = repositoryName && !isAccountSite ? `/${repositoryName}` : "";
const requestedBasePath = process.env.BIKEFIX_PAGES_BASE_PATH ?? "";
const basePath = requestedBasePath || (process.env.BIKEFIX_PAGES_SITE_URL ? "" : inferredBasePath);

if (!repository && !process.env.BIKEFIX_PAGES_SITE_URL) {
  throw new Error("Set GITHUB_REPOSITORY=OWNER/REPOSITORY or BIKEFIX_PAGES_SITE_URL before building the GitHub Pages export.");
}
if (basePath && (!basePath.startsWith("/") || basePath.startsWith("//") || basePath.includes("..") || basePath.includes("\\"))) {
  throw new Error("BIKEFIX_PAGES_BASE_PATH must be empty or a safe path beginning with one slash, such as /bikefix.");
}

const configuredSiteUrl = process.env.BIKEFIX_PAGES_SITE_URL || process.env.SITE_URL || (owner ? `https://${owner.toLowerCase()}.github.io` : "");
let siteUrl;
try {
  const parsed = new URL(configuredSiteUrl);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error();
  siteUrl = parsed.origin;
} catch {
  throw new Error("BIKEFIX_PAGES_SITE_URL / SITE_URL must be an exact HTTPS origin, for example https://owner.github.io.");
}

async function copyIfPresent(relativePath) {
  await cp(path.join(projectRoot, relativePath), path.join(temporaryRoot, relativePath), { recursive: true, force: true });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "bikefix-pages-"));

try {
  for (const relativePath of ["src", "public", "package.json", "tsconfig.json", "next-env.d.ts", "postcss.config.mjs"]) {
    await copyIfPresent(relativePath);
  }

  // The temporary static build deliberately excludes all Node-only execution paths.
  await rm(path.join(temporaryRoot, "src/proxy.ts"), { force: true });
  await rm(path.join(temporaryRoot, "src/app/api"), { recursive: true, force: true });

  // A static host cannot accept or persist a repair request. Publish a clear disabled state instead.
  await writeFile(path.join(temporaryRoot, "src/app/request-repair-guide/page.tsx"), `
import Link from "next/link";

export const metadata = {
  title: "Request a repair guide",
  description: "Repair-guide requests are not enabled on the static GitHub Pages preview.",
  robots: { index: false, follow: false },
};

export default function RequestRepairGuidePage() {
  return (
    <main id="main-content" className="request-page page-shell">
      <p className="request-back-link"><Link href="/">← Back to BikeFix</Link></p>
      <header className="request-page-heading">
        <p className="eyebrow">STATIC PREVIEW</p>
        <h1>Help shape the<br /><span>repair library.</span></h1>
        <p>The GitHub Pages version is a static preview without server-side services. Repair-guide requests are intentionally disabled because this host does not run the BikeFix server or private storage service.</p>
      </header>
      <section className="request-page-card" aria-labelledby="request-static-heading">
        <h2 id="request-static-heading">Request submissions are unavailable here</h2>
        <p>No request form is loaded, no request data is collected by BikeFix, and no submission will be stored from this static preview.</p>
        <p>To evaluate the full request workflow, run BikeFix locally or deploy the complete Node.js application to a host configured according to the deployment runbook.</p>
        <Link className="button button--dark" href="/guides">Explore the repair library →</Link>
      </section>
      <p className="request-page-privacy-link"><Link href="/privacy">Read the static preview privacy notice</Link></p>
    </main>
  );
}
`, "utf8");

  // Dynamic searchParams cannot be evaluated by a static export. The diagnostic wizard
  // remains interactive, but static preview users choose the symptom inside the wizard.
  await writeFile(path.join(temporaryRoot, "src/app/diagnose/page.tsx"), `
import type { Metadata } from "next";
import { DiagnosticWizard } from "@/components/diagnostic/diagnostic-wizard";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Guided symptom check",
  description: "Use curated bicycle symptom questions to find a safer next step. This is educational guidance, not a confirmed diagnosis.",
  robots: { index: false, follow: true },
  ...(getCanonicalUrl("/diagnose") ? { alternates: { canonical: getCanonicalUrl("/diagnose") } } : {}),
};

export default function DiagnosePage() {
  return <DiagnosticWizard />;
}
`, "utf8");

  // Static preview privacy notice: do not imply that the server-side request workflow is active.
  await writeFile(path.join(temporaryRoot, "src/app/privacy/page.tsx"), `
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "Privacy information for the BikeFix static preview.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="privacy-page page-shell">
      <p className="request-back-link"><Link href="/">← Back to BikeFix</Link></p>
      <header className="request-page-heading">
        <p className="eyebrow">PRIVACY · STATIC PREVIEW</p>
        <h1>A static<br /><span>BikeFix preview.</span></h1>
        <p>This GitHub Pages version does not create accounts, submit repair requests, or operate the BikeFix private request store.</p>
      </header>
      <article className="privacy-content">
        <section><h2>Information submitted through BikeFix</h2><p>The static preview contains no active repair-request form or user account system. Do not send personal or sensitive information through public issues, pull requests, or URLs.</p></section>
        <section><h2>Hosting information</h2><p>GitHub Pages is the hosting provider for this preview. GitHub may process technical information such as visitor IP addresses for security and service operation. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a> for details.</p></section>
        <section><h2>Full application request workflow</h2><p>The full Node.js application contains a separate repair-guide request workflow. It is disabled in this static build and must not be enabled on GitHub Pages. Its data handling requirements are documented in the repository deployment and request-workflow runbooks.</p></section>
      </article>
    </main>
  );
}
`, "utf8");

  // Dynamic metadata routes become build-time files in a static export.
  for (const relativePath of ["src/app/robots.ts", "src/app/sitemap.ts"]) {
    const absolutePath = path.join(temporaryRoot, relativePath);
    const content = await readFile(absolutePath, "utf8");
    await writeFile(absolutePath, content.replace(/export const dynamic = "force-dynamic";\s*/g, ""), "utf8");
  }

  const nextConfig = `
import type { NextConfig } from "next";

const basePath = ${JSON.stringify(basePath.replace(/\/$/, ""))};
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: ${basePath ? JSON.stringify(`${basePath}/`) : "undefined"},
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
`;
  await writeFile(path.join(temporaryRoot, "next.config.ts"), nextConfig, "utf8");
  await symlink(path.join(projectRoot, "node_modules"), path.join(temporaryRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");

  const nextCli = path.join(projectRoot, "node_modules/next/dist/bin/next");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    SITE_URL: siteUrl,
    NEXT_PUBLIC_BASE_PATH: basePath,
  };
  await run(process.execPath, [nextCli, "build"], { cwd: temporaryRoot, env });

  const outputDir = path.join(temporaryRoot, "out");
  await rm(path.join(projectRoot, "out"), { recursive: true, force: true });
  await cp(outputDir, path.join(projectRoot, "out"), { recursive: true });
  await writeFile(path.join(projectRoot, "out/.nojekyll"), "", "utf8");
  console.log(`GitHub Pages static export created at ${path.join(projectRoot, "out")}`);
  console.log("This is a static build: API routes, server proxy, repair submissions, and UI-test guide fixtures are excluded.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
