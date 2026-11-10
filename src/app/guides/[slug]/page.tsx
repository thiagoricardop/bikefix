import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RepairGuidePlayer } from "@/components/repair-guide/repair-guide-player";
import { getGuideBySlug, getGuideSources, GUIDE_PLAYER_RECORDS } from "@/data/guides/registry";
import { GUIDE_CONTENT_INVENTORY } from "@/data/guides/content-inventory";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export function generateStaticParams() {
  return GUIDE_PLAYER_RECORDS.map((guide) => ({ slug: guide.slug }));
}

/** Guide routes are catalog-backed; unknown slugs should resolve to the app 404 page. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found", robots: { index: false, follow: false } };
  const inventory = GUIDE_CONTENT_INVENTORY.find((item) => item.guideId === guide.id);
  const canIndex = Boolean(inventory?.published);
  const canonical = getCanonicalUrl(`/guides/${guide.slug}`);
  return {
    title: guide.title,
    description: guide.summary,
    robots: { index: canIndex, follow: true },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

export default async function RepairGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <main id="main-content">
      <RepairGuidePlayer guide={guide} sources={getGuideSources(guide)} />
    </main>
  );
}
