import type { MetadataRoute } from "next";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo/site-url";

export function buildRobots(env: Record<string, string | undefined> = process.env): MetadataRoute.Robots {
  const siteUrl = getSiteUrl(env);
  if (!siteUrl) {
    // Fail closed: without a verified canonical HTTPS origin, do not invite indexing.
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: getCanonicalUrl("/sitemap.xml", env),
    host: siteUrl.host,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
