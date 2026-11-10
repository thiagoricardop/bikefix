import { describe, expect, it } from "vitest";
import { DOMAIN_CATALOG_FIXTURE } from "@/data/fixtures";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { buildGuideContentInventory, GUIDE_CONTENT_INVENTORY, GUIDE_CONTENT_SUMMARY } from "@/data/guides/content-inventory";
import { GUIDE_SOURCE_REFERENCES } from "@/data/guides/sources";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { validateDomainCatalog } from "@/lib/validation/domain-catalog";

const expectedGuideIds = [
  "flat-tire-inner-tube",
  "inspect-front-brake-rub",
  "adjust-mechanical-disc-brake-rub",
  "rear-derailleur-indexing",
  "clean-lubricate-chain",
  "set-saddle-height",
  "assess-handlebar-stem-position",
  "assess-wheel-wobble-rubbing",
];

describe("Phase 07 repair-guide catalog and review workflow", () => {
  it("contains the eight required topics as structured canonical records", () => {
    expect(REPAIR_GUIDES.map((guide) => guide.id)).toEqual(expectedGuideIds);
    for (const guide of REPAIR_GUIDES) {
      expect(guide.steps.length, `${guide.id} steps`).toBeGreaterThanOrEqual(3);
      expect(guide.safetyWarnings.length, `${guide.id} warnings`).toBeGreaterThan(0);
      expect(guide.finalChecks.length, `${guide.id} final checks`).toBeGreaterThan(0);
      expect(guide.stopConditions.length, `${guide.id} stop conditions`).toBeGreaterThan(0);
    }
  });

  it("keeps every guide in draft until a real qualified review is recorded", () => {
    for (const guide of REPAIR_GUIDES) {
      expect(guide.reviewStatus, guide.id).toBe("draft");
      expect(guide.reviewedBy, guide.id).toBeUndefined();
      expect(guide.reviewedAt, guide.id).toBeUndefined();
    }
    expect(REPAIR_GUIDES.some((guide) => guide.reviewStatus === "published")).toBe(false);
  });

  it("links guide source, component, and symptom IDs to real catalog records in both component directions", () => {
    const sourceIds = new Set(GUIDE_SOURCE_REFERENCES.map((source) => source.id));
    const componentById = new Map(BICYCLE_COMPONENTS.map((component) => [component.id, component]));
    for (const guide of REPAIR_GUIDES) {
      expect(guide.sourceIds.length, `${guide.id} sources`).toBeGreaterThan(0);
      for (const sourceId of guide.sourceIds) expect(sourceIds.has(sourceId), `${guide.id} missing source ${sourceId}`).toBe(true);
      for (const componentId of guide.componentIds) {
        expect(componentById.has(componentId), `${guide.id} missing component ${componentId}`).toBe(true);
        expect(componentById.get(componentId)?.guideIds, `${componentId} should link to ${guide.id}`).toContain(guide.id);
      }
    }
    expect(validateDomainCatalog(DOMAIN_CATALOG_FIXTURE)).toEqual([]);
  });

  it("shows sourcing separately from human review and publication", () => {
    expect(GUIDE_CONTENT_SUMMARY).toMatchObject({ total: 8, drafted: 8, inReview: 0, sourced: 8, mechanicallyReviewed: 0, published: 0, blockedPendingReview: 8 });
    expect(GUIDE_CONTENT_INVENTORY).toHaveLength(8);
    for (const item of GUIDE_CONTENT_INVENTORY) {
      expect(item.contentStatus).toBe("Sourced draft · review pending");
      expect(item.mechanicallyReviewed).toBe(false);
      expect(item.published).toBe(false);
      expect(item.reviewer).toBeUndefined();
      expect(item.reviewedAt).toBeUndefined();
    }
  });

  it("detects a guide with an unresolved technical source reference", () => {
    const guide = REPAIR_GUIDES[0];
    const broken = { ...guide, sourceIds: [...guide.sourceIds, "missing-technical-source"] };
    const issues = validateDomainCatalog({
      ...DOMAIN_CATALOG_FIXTURE,
      guides: DOMAIN_CATALOG_FIXTURE.guides.map((item) => item.id === guide.id ? broken : item),
    });
    expect(issues.some((issue) => issue.code === "missing-guide-source" && issue.message.includes("missing-technical-source"))).toBe(true);
  });

  it("detects duplicate guide slugs and draft records carrying reviewer metadata", () => {
    const first = REPAIR_GUIDES[0];
    const second = REPAIR_GUIDES[1];
    const issues = validateDomainCatalog({
      ...DOMAIN_CATALOG_FIXTURE,
      guides: DOMAIN_CATALOG_FIXTURE.guides.map((guide) => {
        if (guide.id === second.id) return { ...guide, slug: first.slug };
        if (guide.id === first.id) return { ...guide, reviewedBy: "Not a real review" };
        return guide;
      }),
    });
    expect(issues.some((issue) => issue.code === "duplicate-guide-slug")).toBe(true);
    expect(issues.some((issue) => issue.code === "draft-has-review-metadata")).toBe(true);
  });

  it("does not accept a guide as published without substantiated review and source evidence", () => {
    const guide = REPAIR_GUIDES[0];
    const invalidPublished = { ...guide, reviewStatus: "published" as const };
    const issues = validateDomainCatalog({
      ...DOMAIN_CATALOG_FIXTURE,
      guides: DOMAIN_CATALOG_FIXTURE.guides.map((item) => item.id === guide.id ? invalidPublished : item),
    });
    expect(issues.some((issue) => issue.code === "unsubstantiated-review")).toBe(true);
  });
  it("represents in-review and reviewed states without letting status labels replace evidence", () => {
    const draft = REPAIR_GUIDES[0];
    const inReview = { ...draft, reviewStatus: "in-review" as const };
    const unsubstantiatedReview = { ...draft, reviewStatus: "reviewed" as const };
    const inventory = buildGuideContentInventory([inReview, unsubstantiatedReview]);
    expect(inventory[0].contentStatus).toBe("In review · not approved");
    expect(inventory[0].mechanicallyReviewed).toBe(false);
    expect(inventory[1].contentStatus).toBe("Review record incomplete");
    expect(inventory[1].mechanicallyReviewed).toBe(false);
  });

  it("only calculates reviewed/published state when the lifecycle evidence is present", () => {
    // Synthetic values exercise the state machine only; they are not written to the canonical catalog.
    const draft = REPAIR_GUIDES[0];
    const testOnlyReview = { ...draft, reviewStatus: "reviewed" as const, reviewedBy: "Test-only synthetic reviewer", reviewedAt: "2026-10-29" };
    const testOnlyPublish = { ...testOnlyReview, reviewStatus: "published" as const };
    const inventory = buildGuideContentInventory([testOnlyReview, testOnlyPublish]);
    expect(inventory[0].contentStatus).toBe("Reviewed · not published");
    expect(inventory[0].mechanicallyReviewed).toBe(true);
    expect(inventory[0].published).toBe(false);
    expect(inventory[1].contentStatus).toBe("Published");
    expect(inventory[1].published).toBe(true);
  });

  it("blocks publication when any attached media lacks documented rights", () => {
    const draft = REPAIR_GUIDES[0];
    const testOnlyPublish = {
      ...draft,
      reviewStatus: "published" as const,
      reviewedBy: "Test-only synthetic reviewer",
      reviewedAt: "2026-10-29",
      media: [{ id: "unlicensed-photo", kind: "image" as const, src: "/missing-photo.jpg", alt: "Test image", provenance: "unknown" as const, rightsStatus: "unknown" as const }],
    };
    const item = buildGuideContentInventory([testOnlyPublish])[0];
    expect(item.published).toBe(false);
    expect(item.contentStatus).toBe("Publication blocked · evidence incomplete");
    expect(item.blockers.some((blocker) => blocker.includes("media provenance and rights"))).toBe(true);
  });

  it("detects duplicate source IDs and incomplete source access metadata", () => {
    const guide = REPAIR_GUIDES[0];
    const duplicated = { ...guide, sourceIds: [guide.sourceIds[0], guide.sourceIds[0]] };
    const sources = GUIDE_SOURCE_REFERENCES.map((source, index) => index === 0 ? { ...source, url: source.url.replace("https://", "http://"), accessedAt: undefined } : source);
    const issues = validateDomainCatalog({
      ...DOMAIN_CATALOG_FIXTURE,
      sources,
      guides: DOMAIN_CATALOG_FIXTURE.guides.map((item) => item.id === guide.id ? duplicated : item),
    });
    expect(issues.some((issue) => issue.code === "duplicate-guide-source-reference")).toBe(true);
    expect(issues.some((issue) => issue.code === "insecure-source-url")).toBe(true);
    expect(issues.some((issue) => issue.code === "source-access-date-missing")).toBe(true);
  });

});
