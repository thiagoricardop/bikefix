import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { GUIDE_SOURCE_REFERENCES } from "@/data/guides/sources";
import type { RepairGuide, SourceReference } from "@/types/domain";

/** Only canonical catalog records are routable. Player fixtures stay test-only. */
export const GUIDE_PLAYER_RECORDS: RepairGuide[] = REPAIR_GUIDES;
export { GUIDE_SOURCE_REFERENCES };

export function getGuideBySlug(slug: string): RepairGuide | undefined {
  return REPAIR_GUIDES.find((guide) => guide.slug === slug);
}

export function getGuideSources(guide: RepairGuide): SourceReference[] {
  const sourceIds = new Set(guide.sourceIds);
  return GUIDE_SOURCE_REFERENCES.filter((source) => sourceIds.has(source.id));
}
