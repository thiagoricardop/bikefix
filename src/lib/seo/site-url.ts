import { isIP } from "node:net";

/** Resolve the public HTTPS origin only from explicit deployment configuration. */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): URL | null {
  const configured = env.SITE_URL?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:") return null;
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Build a canonical URL for root-hosted production or a static project-site
 * deployment (for example, https://owner.github.io/repository).
 */
export function getCanonicalUrl(pathname: string, env: Record<string, string | undefined> = process.env): string | undefined {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return undefined;
  const siteUrl = getSiteUrl(env);
  if (!siteUrl) return undefined;

  const basePath = (env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
  if (basePath && (!basePath.startsWith("/") || basePath.startsWith("//") || basePath.includes("..") || basePath.includes("\\"))) return undefined;
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  return new URL(`${normalizedBasePath}${pathname}`, siteUrl).toString();
}
