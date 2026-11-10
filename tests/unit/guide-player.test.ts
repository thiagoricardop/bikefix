import { describe, expect, it } from "vitest";
import { GUIDE_PLAYER_FIXTURES } from "@/data/guides/guide-player-fixtures";
import { getGuideBySlug, GUIDE_PLAYER_RECORDS } from "@/data/guides/registry";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { DOMAIN_CATALOG_FIXTURE } from "@/data/fixtures";
import { validateDomainCatalog } from "@/lib/validation/domain-catalog";
import { guideMediaSchema, repairGuideSchema } from "@/types/domain";

describe("Phase 06 repair guide player fixtures", () => {
  it("keeps all player fixtures structurally valid and clearly draft", () => {
    expect(GUIDE_PLAYER_FIXTURES.length).toBeGreaterThanOrEqual(2);
    for (const guide of GUIDE_PLAYER_FIXTURES) {
      expect(repairGuideSchema.safeParse(guide).success, guide.id).toBe(true);
      expect(guide.reviewStatus).toBe("draft");
      expect(guide.reviewedBy).toBeUndefined();
      expect(guide.reviewedAt).toBeUndefined();
    }
  });

  it("keeps public guide routes limited to canonical catalog records", () => {
    const slugs = GUIDE_PLAYER_RECORDS.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(GUIDE_PLAYER_RECORDS).toEqual(REPAIR_GUIDES);
    for (const guide of REPAIR_GUIDES) expect(getGuideBySlug(guide.slug)?.id).toBe(guide.id);
    for (const fixture of GUIDE_PLAYER_FIXTURES) expect(getGuideBySlug(fixture.slug)).toBeUndefined();
    expect(getGuideBySlug("missing-guide-slug")).toBeUndefined();
  });

  it("validates player fixture component and symptom references against the domain catalog", () => {
    expect(validateDomainCatalog(DOMAIN_CATALOG_FIXTURE)).toEqual([]);
  });

  it("represents source, attribution, license, rights state, captions, and transcript metadata", () => {
    const media = guideMediaSchema.safeParse({
      id: "example-media",
      kind: "video",
      src: "/media/example.mp4",
      alt: "A sample media test",
      captionsUrl: "/media/example.vtt",
      transcript: "Text alternative for the recording.",
      provenance: "licensed",
      rightsStatus: "documented",
      attribution: "Example creator",
      sourceUrl: "https://example.com/media",
      sourceIds: ["source-example"],
      licenseName: "Creative Commons Attribution 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    });
    expect(media.success).toBe(true);
  });

  it("flags media claiming documented rights without provenance details", () => {
    const guide = GUIDE_PLAYER_FIXTURES[0];
    const broken = {
      ...guide,
      media: [{ ...guide.media[0], rightsStatus: "documented" as const, attribution: undefined, sourceUrl: undefined, sourceIds: [], licenseName: undefined }],
    };
    const issues = validateDomainCatalog({ ...DOMAIN_CATALOG_FIXTURE, guides: [...DOMAIN_CATALOG_FIXTURE.guides.filter((item) => item.id !== guide.id), broken] });
    expect(issues.some((issue) => issue.code === "incomplete-media-provenance")).toBe(true);
  });

  it("does not allow a published status without reviewer metadata and traceable sources", () => {
    const guide = GUIDE_PLAYER_FIXTURES[0];
    const invalidPublished = { ...guide, reviewStatus: "published" as const };
    const issues = validateDomainCatalog({ ...DOMAIN_CATALOG_FIXTURE, guides: [...DOMAIN_CATALOG_FIXTURE.guides.filter((item) => item.id !== guide.id), invalidPublished] });
    expect(issues.some((issue) => issue.code === "unsubstantiated-review")).toBe(true);
  });
});
