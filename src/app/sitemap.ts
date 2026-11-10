import type { MetadataRoute } from "next";
import { GUIDE_CONTENT_INVENTORY } from "@/data/guides/content-inventory";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo/site-url";

export function buildSitemap(env: Record<string, string | undefined> = process.env): MetadataRoute.Sitemap {
  if (!getSiteUrl(env)) return [];

  const publicRoutes: MetadataRoute.Sitemap = [
    { url: getCanonicalUrl("/", env)!, changeFrequency: "weekly", priority: 1 },
    { url: getCanonicalUrl("/privacy", env)!, changeFrequency: "yearly", priority: 0.2 },
  ];

  const publishedGuideRoutes: MetadataRoute.Sitemap = GUIDE_CONTENT_INVENTORY
    .filter((guide) => guide.published)
    .map((guide) => ({
      url: getCanonicalUrl(`/guides/${guide.slug}`, env)!,
      changeFrequency: "yearly",
      priority: 0.6,
    }));

  if (publishedGuideRoutes.length > 0) {
    publicRoutes.push({ url: getCanonicalUrl("/guides", env)!, changeFrequency: "monthly", priority: 0.7 });
  }

  return [...publicRoutes, ...publishedGuideRoutes];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
