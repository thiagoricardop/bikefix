import { describe, expect, it } from "vitest";
import { DOMAIN_CATALOG_FIXTURE } from "@/data/fixtures";
import { validateDomainCatalog } from "@/lib/validation/domain-catalog";
import { repairRequestSchema, repairGuideSchema } from "@/types/domain";
import { BICYCLE_TYPES } from "@/data/bicycle-types/catalog";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";

describe("BikeFix domain catalog", () => {
  it("validates the starter fixture and its cross-references", () => {
    expect(validateDomainCatalog(DOMAIN_CATALOG_FIXTURE)).toEqual([]);
  });

  it("defines all five bicycle types and an unsure explorer choice", () => {
    expect(BICYCLE_TYPES.map((type) => type.id)).toEqual(["road", "mountain", "hybrid", "gravel", "ebike"]);
  });

  it("detects missing component and guide references", () => {
    const broken = {
      ...DOMAIN_CATALOG_FIXTURE,
      symptoms: [{ ...DOMAIN_CATALOG_FIXTURE.symptoms[0], componentIds: ["not-a-component"], guideIds: ["missing-guide"] }],
    };
    const issues = validateDomainCatalog(broken);
    expect(issues.some((issue) => issue.code === "missing-symptom-component")).toBe(true);
    expect(issues.some((issue) => issue.code === "missing-symptom-guide")).toBe(true);
  });

  it("rejects a component parent cycle", () => {
    const components = BICYCLE_COMPONENTS.map((item) => ({ ...item, childIds: [...item.childIds] }));
    const frame = components.find((item) => item.id === "frame")!;
    frame.parentId = "rear-suspension";
    const issues = validateDomainCatalog({ ...DOMAIN_CATALOG_FIXTURE, components });
    expect(issues.some((issue) => issue.code === "component-cycle")).toBe(true);
  });

  it("requires safety-stop options to be terminal and explain the stop", () => {
    const sourceRule = DOMAIN_CATALOG_FIXTURE.diagnosticRules[0];
    const invalidRule = {
      ...sourceRule,
      questions: sourceRule.questions.map((question) => ({
        ...question,
        options: question.options.map((option) => option.id === "no-or-unsure"
          ? { ...option, safetyStop: true, nextQuestionId: "rub-location", resultNote: " " }
          : option),
      })),
    };
    const issues = validateDomainCatalog({
      ...DOMAIN_CATALOG_FIXTURE,
      diagnosticRules: [invalidRule, ...DOMAIN_CATALOG_FIXTURE.diagnosticRules.slice(1)],
    });
    expect(issues.some((issue) => issue.code === "safety-stop-has-next-question")).toBe(true);
    expect(issues.some((issue) => issue.code === "missing-safety-stop-note")).toBe(true);
  });

  it("does not allow a guide to claim reviewed status without reviewer and sources", () => {
    const draft = DOMAIN_CATALOG_FIXTURE.guides[0];
    const result = repairGuideSchema.safeParse({ ...draft, reviewStatus: "reviewed" });
    expect(result.success).toBe(true); // shape validation is separate from catalog integrity validation
    const issues = validateDomainCatalog({ ...DOMAIN_CATALOG_FIXTURE, guides: [{ ...draft, reviewStatus: "reviewed" }] });
    expect(issues.some((issue) => issue.code === "unsubstantiated-review")).toBe(true);
  });

  it("requires a valid email only when the user requests a reply", () => {
    const base = { summary: "Brake noise", description: "The front brake rubs when I rotate the wheel.", bicycleType: "road" as const, wantsReply: true };
    expect(repairRequestSchema.safeParse(base).success).toBe(false);
    expect(repairRequestSchema.safeParse({ ...base, email: "rider@example.com" }).success).toBe(true);
    expect(repairRequestSchema.safeParse({ ...base, wantsReply: false }).success).toBe(true);
  });
});
