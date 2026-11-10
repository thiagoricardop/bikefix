import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { GUIDE_SOURCE_REFERENCES } from "@/data/guides/sources";
import type { RepairGuide, SourceReference } from "@/types/domain";

function hasQualifiedReviewEvidence(guide: RepairGuide, hasSourceGap: boolean, linkedSourceCount: number): boolean {
  return Boolean(
    guide.reviewedBy?.trim()
    && guide.reviewedAt
    && linkedSourceCount > 0
    && !hasSourceGap
    && ["reviewed", "published"].includes(guide.reviewStatus),
  );
}

function hasDocumentedMediaRights(guide: RepairGuide): boolean {
  return guide.media.every((media) => {
    if (media.rightsStatus === "not-applicable") return true;
    if (media.rightsStatus !== "documented") return false;
    return Boolean(media.attribution?.trim() || media.sourceUrl?.trim() || media.licenseName?.trim() || media.sourceIds?.length);
  });
}

function statusLabel(guide: RepairGuide, hasSourceGap: boolean, mechanicallyReviewed: boolean, published: boolean): string {
  if (guide.reviewStatus === "retired") return "Retired";
  if (guide.reviewStatus === "published") return published ? "Published" : "Publication blocked · evidence incomplete";
  if (guide.reviewStatus === "reviewed") return mechanicallyReviewed ? "Reviewed · not published" : "Review record incomplete";
  if (guide.reviewStatus === "in-review") return hasSourceGap ? "In review · source gap" : "In review · not approved";
  return hasSourceGap ? "Draft · source gap" : "Sourced draft · review pending";
}

export type GuideContentInventoryItem = {
  guideId: string;
  slug: string;
  title: string;
  reviewStatus: RepairGuide["reviewStatus"];
  contentStatus: string;
  sourceCount: number;
  sources: SourceReference[];
  mechanicallyReviewed: boolean;
  reviewer: string | undefined;
  reviewedAt: string | undefined;
  published: boolean;
  mediaStatus: string;
  blockers: string[];
};

/**
 * Pure editorial inventory builder, also used by tests to exercise each lifecycle state.
 * Source evidence is not a substitute for a qualified human mechanical review.
 */
export function buildGuideContentInventory(
  guides: readonly RepairGuide[] = REPAIR_GUIDES,
  sourceReferences: readonly SourceReference[] = GUIDE_SOURCE_REFERENCES,
): GuideContentInventoryItem[] {
  const sourcesById = new Map(sourceReferences.map((source) => [source.id, source]));

  return guides.map((guide) => {
    const linkedSources = guide.sourceIds.map((id) => sourcesById.get(id)).filter((source): source is SourceReference => source !== undefined);
    const hasSourceGap = guide.sourceIds.length === 0 || linkedSources.length !== guide.sourceIds.length || new Set(guide.sourceIds).size !== guide.sourceIds.length;
    const mechanicallyReviewed = hasQualifiedReviewEvidence(guide, hasSourceGap, linkedSources.length);
    const mediaRightsDocumented = hasDocumentedMediaRights(guide);
    const published = guide.reviewStatus === "published" && mechanicallyReviewed && mediaRightsDocumented;
    const blockers = [
      ...(hasSourceGap ? ["One or more technical source references are missing, duplicated, or unresolved."] : []),
      ...(!mechanicallyReviewed ? ["Qualified mechanical review has not been recorded; the guide must remain a draft or in-review."] : []),
      ...(guide.reviewStatus === "published" && !mediaRightsDocumented ? ["Published status is blocked until media provenance and rights are documented or marked not applicable."] : []),
      ...(guide.media.length === 0 ? ["No media is attached. Text-only content is allowed, but any future media needs a lawful provenance/rights record."] : []),
    ];

    return {
      guideId: guide.id,
      slug: guide.slug,
      title: guide.title,
      reviewStatus: guide.reviewStatus,
      contentStatus: statusLabel(guide, hasSourceGap, mechanicallyReviewed, published),
      sourceCount: linkedSources.length,
      sources: linkedSources,
      mechanicallyReviewed,
      reviewer: mechanicallyReviewed ? guide.reviewedBy : undefined,
      reviewedAt: mechanicallyReviewed ? guide.reviewedAt : undefined,
      published,
      mediaStatus: guide.media.length ? (mediaRightsDocumented ? "Media rights documented" : "Media attached; rights incomplete") : "Text only; no media rights asserted",
      blockers,
    };
  });
}

export const GUIDE_CONTENT_INVENTORY = buildGuideContentInventory();

export const GUIDE_CONTENT_SUMMARY = {
  total: GUIDE_CONTENT_INVENTORY.length,
  drafted: GUIDE_CONTENT_INVENTORY.filter((item) => item.reviewStatus === "draft").length,
  inReview: GUIDE_CONTENT_INVENTORY.filter((item) => item.reviewStatus === "in-review").length,
  sourced: GUIDE_CONTENT_INVENTORY.filter((item) => item.sourceCount > 0).length,
  mechanicallyReviewed: GUIDE_CONTENT_INVENTORY.filter((item) => item.mechanicallyReviewed).length,
  published: GUIDE_CONTENT_INVENTORY.filter((item) => item.published).length,
  blockedPendingReview: GUIDE_CONTENT_INVENTORY.filter((item) => !item.mechanicallyReviewed).length,
};
