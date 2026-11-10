import { describe, expect, it } from "vitest";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { getDiagnosisView } from "@/lib/diagnostics/deterministic-diagnosis";
import type { RepairGuide } from "@/types/domain";

describe("deterministic diagnostic engine", () => {
  it("branches through the front-brake flow and does not label a result as a diagnosis", () => {
    const entry = getDiagnosisView({ symptomId: "front-brake-rubs", bicycleType: "road" });
    expect(entry.kind).toBe("question");
    if (entry.kind !== "question") return;
    expect(entry.question.id).toBe("braking-effective");

    const location = getDiagnosisView({
      symptomId: "front-brake-rubs",
      bicycleType: "road",
      answers: { "braking-effective": "yes" },
    });
    expect(location.kind).toBe("question");
    if (location.kind !== "question") return;
    expect(location.question.id).toBe("rub-location");

    const result = getDiagnosisView({
      symptomId: "front-brake-rubs",
      bicycleType: "road",
      answers: { "braking-effective": "yes", "rub-location": "disc" },
    });
    expect(result.kind).toBe("result");
    if (result.kind !== "result") return;
    expect(result.resultNote).toMatch(/confirm whether it is mechanical or hydraulic/i);
    expect(result.recommendations).toHaveLength(0); // The only related guide fixture is draft.
  });

  it("returns a safety stop when braking is weak or uncertain", () => {
    const result = getDiagnosisView({
      symptomId: "front-brake-rubs",
      bicycleType: "mountain",
      answers: { "braking-effective": "no-or-unsure" },
    });
    expect(result.kind).toBe("safety-stop");
    if (result.kind === "safety-stop") expect(result.message).toMatch(/stop riding/i);
  });

  it("stops immediately for suspected frame damage without asking follow-up questions", () => {
    const result = getDiagnosisView({ symptomId: "visible-frame-damage", bicycleType: "gravel" });
    expect(result.kind).toBe("safety-stop");
    if (result.kind === "safety-stop") {
      expect(result.questionPath).toEqual([]);
      expect(result.message).toMatch(/stop riding/i);
    }
  });

  it("uses a safety stop when the rider cannot assess the flat-tire condition", () => {
    const result = getDiagnosisView({
      symptomId: "flat-tire",
      bicycleType: "road",
      answers: { "tire-air-loss": "unknown" },
    });
    expect(result.kind).toBe("safety-stop");
    if (result.kind === "safety-stop") expect(result.message).toMatch(/Do not ride/i);
  });

  it("branches flat-tire assessment and escalates visible tire or wheel damage", () => {
    const next = getDiagnosisView({
      symptomId: "flat-tire",
      bicycleType: "hybrid",
      answers: { "tire-air-loss": "flat" },
    });
    expect(next.kind).toBe("question");
    if (next.kind === "question") expect(next.question.id).toBe("tire-wheel-damage");

    const stopped = getDiagnosisView({
      symptomId: "flat-tire",
      bicycleType: "hybrid",
      answers: { "tire-air-loss": "flat", "tire-wheel-damage": "yes" },
    });
    expect(stopped.kind).toBe("safety-stop");
  });

  it("does not apply e-bike electrical checks to a non-electric type or an unknown type", () => {
    expect(getDiagnosisView({ symptomId: "ebike-assist-unavailable", bicycleType: "road" }).kind).toBe("not-applicable");
    const unknown = getDiagnosisView({ symptomId: "ebike-assist-unavailable", bicycleType: "unsure" });
    expect(unknown.kind).toBe("needs-bike-type");

    const ebike = getDiagnosisView({ symptomId: "ebike-assist-unavailable", bicycleType: "ebike" });
    expect(ebike.kind).toBe("question");
    if (ebike.kind === "question") expect(ebike.question.id).toBe("ebike-battery-safety");
  });

  it("sends a damaged or uncertain e-bike battery to a safety stop", () => {
    const result = getDiagnosisView({
      symptomId: "ebike-assist-unavailable",
      bicycleType: "ebike",
      answers: { "ebike-battery-safety": "unsure" },
    });
    expect(result.kind).toBe("safety-stop");
    if (result.kind === "safety-stop") expect(result.message).toMatch(/do not charge|do not use|not charge/i);
  });

  it("keeps unknown symptoms and unconfigured symptom rules explicit instead of guessing", () => {
    expect(getDiagnosisView({ symptomId: "not-a-real-symptom", bicycleType: "road" }).kind).toBe("invalid-symptom");
    expect(getDiagnosisView({ symptomId: "flat-tire", bicycleType: "road", answers: { "tire-air-loss": "invented-answer" } }).kind).toBe("question");
  });

  it("only recommends sourced, reviewed, compatible guides and ranks direct symptom matches first", () => {
    const draft = REPAIR_GUIDES[0];
    const reviewedDirect: RepairGuide = {
      ...draft,
      id: "reviewed-brake-guide",
      slug: "reviewed-brake-guide",
      title: "Reviewed front brake guide",
      sourceIds: ["manufacturer-source"],
      reviewStatus: "reviewed",
      reviewedBy: "Qualified mechanic",
      reviewedAt: "2026-10-20",
      symptomIds: ["front-brake-rubs"],
      bicycleTypes: ["road"],
    };
    const reviewedComponentOnly: RepairGuide = {
      ...reviewedDirect,
      id: "reviewed-wheel-guide",
      slug: "reviewed-wheel-guide",
      title: "Reviewed wheel guide",
      symptomIds: [],
      componentIds: ["front-wheel"],
    };

    const publishedComponentOnly: RepairGuide = {
      ...reviewedComponentOnly,
      id: "published-wheel-guide",
      slug: "published-wheel-guide",
      title: "Published wheel guide",
      reviewStatus: "published",
    };

    const result = getDiagnosisView({
      symptomId: "front-brake-rubs",
      bicycleType: "road",
      answers: { "braking-effective": "yes", "rub-location": "rim" },
    }, { guides: [draft, reviewedComponentOnly, reviewedDirect, publishedComponentOnly] });
    expect(result.kind).toBe("result");
    if (result.kind !== "result") return;
    const recommendedIds = result.recommendations.map((item) => item.guide.id);
    expect(recommendedIds[0]).toBe("reviewed-brake-guide");
    expect(new Set(recommendedIds)).toEqual(new Set(["reviewed-brake-guide", "reviewed-wheel-guide", "published-wheel-guide"]));
    expect(result.recommendations[0].relevance).toMatch(/front brake rubs/i);
    expect(result.recommendations.some((item) => item.guide.id === draft.id)).toBe(false);
  });
});
