import type { BicycleComponent, BicycleTypeDefinition } from "@/types/bicycle";
import { bicycleComponentSchema } from "@/types/bicycle";
import type { DiagnosticRule, RepairGuide, SourceReference, Symptom } from "@/types/domain";
import { diagnosticRuleSchema, repairGuideSchema, sourceSchema, symptomSchema } from "@/types/domain";
import { validateBicycleCatalog, type CatalogIssue } from "@/lib/validation/bicycle-catalog";

export type DomainCatalog = {
  components: BicycleComponent[];
  bicycleTypes: BicycleTypeDefinition[];
  symptoms: Symptom[];
  guides: RepairGuide[];
  diagnosticRules: DiagnosticRule[];
  sources: SourceReference[];
};

/** Validates both record shapes and references across the complete local domain catalog. */
export function validateDomainCatalog(catalog: DomainCatalog): CatalogIssue[] {
  const issues = validateBicycleCatalog(catalog.components, catalog.bicycleTypes);
  const componentIds = new Set(catalog.components.map((item) => item.id));
  const symptomIds = new Set(catalog.symptoms.map((item) => item.id));
  const guideIds = new Set(catalog.guides.map((item) => item.id));
  const sourceIds = new Set(catalog.sources.map((item) => item.id));

  const checkUnique = (values: { id: string }[], kind: string) => {
    const seen = new Set<string>();
    values.forEach((value) => {
      if (seen.has(value.id)) issues.push({ code: `duplicate-${kind}`, message: `Duplicate ${kind} ID: ${value.id}` });
      seen.add(value.id);
    });
  };
  checkUnique(catalog.symptoms, "symptom");
  checkUnique(catalog.guides, "guide");
  const guideSlugs = new Set<string>();
  catalog.guides.forEach((guide) => {
    if (guideSlugs.has(guide.slug)) issues.push({ code: "duplicate-guide-slug", message: `Duplicate guide slug: ${guide.slug}` });
    guideSlugs.add(guide.slug);
  });
  checkUnique(catalog.sources, "source");
  checkUnique(catalog.diagnosticRules, "diagnostic-rule");

  catalog.components.forEach((item, index) => {
    const result = bicycleComponentSchema.safeParse(item);
    if (!result.success) issues.push({ code: "invalid-component", message: `Component ${index}: ${result.error.issues.map((x) => x.message).join("; ")}` });
    item.commonSymptoms.forEach((title) => {
      if (!title.trim()) issues.push({ code: "empty-component-symptom", message: `${item.id} contains an empty symptom label` });
    });
    item.guideIds.forEach((id) => { if (!guideIds.has(id)) issues.push({ code: "missing-component-guide", message: `${item.id} references missing guide ${id}` }); });
  });
  catalog.symptoms.forEach((item, index) => {
    const result = symptomSchema.safeParse(item);
    if (!result.success) issues.push({ code: "invalid-symptom", message: `Symptom ${index}: ${result.error.issues.map((x) => x.message).join("; ")}` });
    item.componentIds.forEach((id) => { if (!componentIds.has(id)) issues.push({ code: "missing-symptom-component", message: `${item.id} references missing component ${id}` }); });
    item.guideIds.forEach((id) => { if (!guideIds.has(id)) issues.push({ code: "missing-symptom-guide", message: `${item.id} references missing guide ${id}` }); });
  });
  catalog.sources.forEach((item, index) => {
    const result = sourceSchema.safeParse(item);
    if (!result.success) issues.push({ code: "invalid-source", message: `Source ${index}: ${result.error.issues.map((x) => x.message).join("; ")}` });
    if (!item.url.startsWith("https://")) issues.push({ code: "insecure-source-url", message: `${item.id} must use HTTPS for external source links` });
    if (!item.accessedAt) issues.push({ code: "source-access-date-missing", message: `${item.id} needs a source access date for the editorial record` });
  });
  catalog.guides.forEach((item, index) => {
    const result = repairGuideSchema.safeParse(item);
    if (!result.success) issues.push({ code: "invalid-guide", message: `Guide ${index}: ${result.error.issues.map((x) => x.message).join("; ")}` });
    item.componentIds.forEach((id) => { if (!componentIds.has(id)) issues.push({ code: "missing-guide-component", message: `${item.id} references missing component ${id}` }); });
    item.symptomIds.forEach((id) => { if (!symptomIds.has(id)) issues.push({ code: "missing-guide-symptom", message: `${item.id} references missing symptom ${id}` }); });
    item.sourceIds.forEach((id) => { if (!sourceIds.has(id)) issues.push({ code: "missing-guide-source", message: `${item.id} references missing source ${id}` }); });
    if (new Set(item.sourceIds).size !== item.sourceIds.length) issues.push({ code: "duplicate-guide-source-reference", message: `${item.id} repeats one or more source IDs` });
    if (new Set(item.componentIds).size !== item.componentIds.length) issues.push({ code: "duplicate-guide-component-reference", message: `${item.id} repeats one or more component IDs` });
    if (new Set(item.symptomIds).size !== item.symptomIds.length) issues.push({ code: "duplicate-guide-symptom-reference", message: `${item.id} repeats one or more symptom IDs` });
    const mediaIds = new Set(item.media.map((media) => media.id));
    if (mediaIds.size !== item.media.length) issues.push({ code: "duplicate-guide-media-id", message: `${item.id} has duplicate media IDs` });
    item.media.forEach((media) => {
      (media.sourceIds ?? []).forEach((id) => {
        if (!sourceIds.has(id)) issues.push({ code: "missing-media-source", message: `${item.id}/${media.id} references missing media source ${id}` });
      });
      if (media.rightsStatus === "documented" && !(media.attribution?.trim() || media.sourceUrl?.trim() || media.licenseName?.trim() || (media.sourceIds?.length ?? 0) > 0)) {
        issues.push({ code: "incomplete-media-provenance", message: `${item.id}/${media.id} says rights are documented but has no attribution, source URL, license name, or source ID` });
      }
      if (media.licenseUrl && !media.licenseName) {
        issues.push({ code: "media-license-name-missing", message: `${item.id}/${media.id} has a license URL but no license name` });
      }
    });
    item.steps.forEach((step) => step.mediaIds.forEach((id) => {
      if (!mediaIds.has(id)) issues.push({ code: "missing-guide-media", message: `${item.id}/${step.id} references missing media ${id}` });
    }));
    if (["reviewed", "published"].includes(item.reviewStatus) && (!item.reviewedBy?.trim() || !item.reviewedAt || item.sourceIds.length === 0)) {
      issues.push({ code: "unsubstantiated-review", message: `${item.id} is marked ${item.reviewStatus} without reviewer, review date, and source references` });
    }
    if (item.reviewStatus === "draft" && (item.reviewedBy?.trim() || item.reviewedAt)) {
      issues.push({ code: "draft-has-review-metadata", message: `${item.id} is a draft but contains reviewer metadata; complete the review workflow before recording approval` });
    }
    if (item.reviewStatus === "published" && item.media.some((media) => media.rightsStatus !== "documented" && media.rightsStatus !== "not-applicable")) {
      issues.push({ code: "published-guide-media-rights-incomplete", message: `${item.id} is published while one or more media rights states are missing or incomplete` });
    }
  });
  catalog.diagnosticRules.forEach((rule, index) => {
    const result = diagnosticRuleSchema.safeParse(rule);
    if (!result.success) issues.push({ code: "invalid-diagnostic-rule", message: `Diagnostic rule ${index}: ${result.error.issues.map((x) => x.message).join("; ")}` });
    rule.symptomIds.forEach((id) => { if (!symptomIds.has(id)) issues.push({ code: "missing-rule-symptom", message: `${rule.id} references missing symptom ${id}` }); });
    const questions = new Map(rule.questions.map((question) => [question.id, question]));
    if (!questions.has(rule.entryQuestionId)) issues.push({ code: "missing-entry-question", message: `${rule.id} references missing entry question ${rule.entryQuestionId}` });
    rule.questions.forEach((question) => question.options.forEach((option) => {
      if (option.nextQuestionId && !questions.has(option.nextQuestionId)) issues.push({ code: "missing-next-question", message: `${rule.id}/${question.id}/${option.id} references missing question ${option.nextQuestionId}` });
      if (option.safetyStop && option.nextQuestionId) issues.push({ code: "safety-stop-has-next-question", message: `${rule.id}/${question.id}/${option.id} cannot continue to another question after a safety stop` });
      if (option.safetyStop && !option.resultNote?.trim()) issues.push({ code: "missing-safety-stop-note", message: `${rule.id}/${question.id}/${option.id} needs an explanatory safety-stop message` });
      option.recommendedGuideIds.forEach((id) => { if (!guideIds.has(id)) issues.push({ code: "missing-option-guide", message: `${rule.id}/${option.id} references missing guide ${id}` }); });
    }));
    // Detect cycles in question navigation; cycles can trap a user in a diagnostic loop.
    const visit = (id: string, active: Set<string>, done: Set<string>) => {
      if (active.has(id)) { issues.push({ code: "diagnostic-cycle", message: `${rule.id} contains a question navigation cycle at ${id}` }); return; }
      if (done.has(id)) return;
      active.add(id);
      questions.get(id)?.options.forEach((option) => { if (option.nextQuestionId) visit(option.nextQuestionId, active, done); });
      active.delete(id);
      done.add(id);
    };
    visit(rule.entryQuestionId, new Set(), new Set());
  });
  return issues;
}
