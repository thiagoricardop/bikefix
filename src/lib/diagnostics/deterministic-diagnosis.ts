import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { DIAGNOSTIC_RULES } from "@/data/diagnostics/catalog";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { SYMPTOMS } from "@/data/symptoms/catalog";
import type {
  DiagnosticOption,
  DiagnosticQuestion,
  DiagnosticRule,
  RepairGuide,
  Symptom,
} from "@/types/domain";
import type { ExplorerBicycleType } from "@/types/bicycle";

export type DiagnosticAnswers = Record<string, string>;

export interface DiagnosticGuideRecommendation {
  guide: RepairGuide;
  relevance: string;
  applicabilityNote?: string;
  score: number;
}

export type DiagnosisView =
  | {
      kind: "question";
      symptom: Symptom;
      rule: DiagnosticRule;
      question: DiagnosticQuestion;
      questionPath: string[];
      progressIndex: number;
    }
  | {
      kind: "result";
      symptom: Symptom;
      rule: DiagnosticRule;
      questionPath: string[];
      resultNote: string;
      recommendations: DiagnosticGuideRecommendation[];
    }
  | {
      kind: "safety-stop";
      symptom: Symptom;
      title: string;
      message: string;
      questionPath: string[];
    }
  | {
      kind: "needs-bike-type";
      symptom: Symptom;
      message: string;
    }
  | {
      kind: "not-applicable";
      symptom: Symptom;
      message: string;
    }
  | {
      kind: "not-configured";
      symptom: Symptom;
      message: string;
    }
  | {
      kind: "invalid-symptom";
      message: string;
    };

export interface DiagnosisInput {
  symptomId: string;
  bicycleType: ExplorerBicycleType;
  answers?: DiagnosticAnswers;
}

export interface DiagnosisCatalogs {
  symptoms?: Symptom[];
  rules?: DiagnosticRule[];
  guides?: RepairGuide[];
  components?: Array<{ id: string; name: string }>;
}

function isGuideActuallyReviewed(guide: RepairGuide): boolean {
  return (guide.reviewStatus === "reviewed" || guide.reviewStatus === "published")
    && Boolean(guide.reviewedBy?.trim())
    && Boolean(guide.reviewedAt)
    && guide.sourceIds.length > 0;
}

function rankReviewedGuides(
  symptom: Symptom,
  bicycleType: ExplorerBicycleType,
  preferredGuideIds: string[],
  guides: RepairGuide[],
  components: Array<{ id: string; name: string }>,
): DiagnosticGuideRecommendation[] {
  const preferred = new Set([...preferredGuideIds, ...symptom.guideIds]);
  const componentIds = new Set(symptom.componentIds);
  const componentNames = new Map(components.map((component) => [component.id, component.name]));
  const candidates: DiagnosticGuideRecommendation[] = [];
  for (const guide of guides) {
    if (!isGuideActuallyReviewed(guide)) continue;
    if (bicycleType !== "unsure" && !guide.bicycleTypes.includes(bicycleType)) continue;

    const symptomMatch = guide.symptomIds.includes(symptom.id);
    const componentMatches = guide.componentIds.filter((id) => componentIds.has(id));
    const explicitlyRecommended = preferred.has(guide.id);
    if (!symptomMatch && componentMatches.length === 0 && !explicitlyRecommended) continue;

    const score = (explicitlyRecommended ? 8 : 0)
      + (symptomMatch ? 5 : 0)
      + componentMatches.length * 2
      + (bicycleType !== "unsure" && guide.bicycleTypes.includes(bicycleType) ? 2 : 0);
    const relevance = symptomMatch
      ? `Matches the “${symptom.title}” symptom${componentMatches.length ? ` and relates to ${componentMatches.map((id) => componentNames.get(id) ?? id).join(", ")}` : ""}.`
      : explicitlyRecommended
        ? `Selected by the curated diagnostic rule for “${symptom.title}”.`
        : `Relates to ${componentMatches.map((id) => componentNames.get(id) ?? id).join(", ")}, which may be involved in this symptom.`;

    candidates.push({
      guide,
      score,
      relevance,
      ...(bicycleType === "unsure" ? { applicabilityNote: "Your bicycle type is not confirmed. Check the guide's exact compatibility before using it." } : {}),
    });
  }

  return candidates.sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title));
}

/**
 * Resolve a diagnostic session using only curated rules and catalog data.
 * No probabilities or inferred component configurations are generated.
 */
export function getDiagnosisView(
  input: DiagnosisInput,
  catalogs: DiagnosisCatalogs = {},
): DiagnosisView {
  const symptoms = catalogs.symptoms ?? SYMPTOMS;
  const rules = catalogs.rules ?? DIAGNOSTIC_RULES;
  const guides = catalogs.guides ?? REPAIR_GUIDES;
  const components = catalogs.components ?? BICYCLE_COMPONENTS;
  const symptom = symptoms.find((item) => item.id === input.symptomId);
  if (!symptom) {
    return { kind: "invalid-symptom", message: "That symptom is not in the current catalogue. Choose a listed symptom to begin." };
  }

  if (symptom.severity === "stop-riding") {
    return {
      kind: "safety-stop",
      symptom,
      title: "Stop riding and seek a qualified inspection",
      message: symptom.safetyNote ?? "Do not ride with suspected structural damage. Have the bicycle assessed by a qualified mechanic.",
      questionPath: [],
    };
  }

  if (symptom.bicycleTypes?.length) {
    if (input.bicycleType === "unsure") {
      return {
        kind: "needs-bike-type",
        symptom,
        message: "This symptom is specific to an e-bike electrical-assist system. Confirm that you have an e-bike before continuing; the bicycle illustration alone cannot identify your installed system.",
      };
    }
    if (!symptom.bicycleTypes.includes(input.bicycleType)) {
      return {
        kind: "not-applicable",
        symptom,
        message: "The selected symptom is catalogued for a different bicycle type. Do not apply electrical-system checks to a non-electric bicycle. Choose another symptom or confirm the bicycle type.",
      };
    }
  }

  const rule = rules.find((candidate) => candidate.symptomIds.includes(symptom.id));
  if (!rule) {
    return {
      kind: "not-configured",
      symptom,
      message: "There is not yet a reviewed diagnostic question flow for this symptom. BikeFix will not guess at a cause. Use the symptom safety note and ask a qualified mechanic when the condition may affect safe riding.",
    };
  }

  const answers = input.answers ?? {};
  const questionById = new Map(rule.questions.map((question) => [question.id, question]));
  const questionPath: string[] = [];
  let questionId: string | undefined = rule.entryQuestionId;
  let selectedOption: DiagnosticOption | undefined;

  // The bounded traversal also protects against accidental cycles in authored rules.
  for (let visit = 0; visit < rule.questions.length + 1; visit += 1) {
    if (!questionId) break;
    const question = questionById.get(questionId);
    if (!question) {
      return {
        kind: "not-configured",
        symptom,
        message: "This diagnostic flow contains an incomplete question reference. No result was inferred; choose another symptom or ask a qualified mechanic.",
      };
    }
    questionPath.push(question.id);
    const answerId = answers[question.id];
    if (!answerId) {
      return {
        kind: "question",
        symptom,
        rule,
        question,
        questionPath,
        progressIndex: questionPath.length,
      };
    }
    selectedOption = question.options.find((option) => option.id === answerId);
    if (!selectedOption) {
      return {
        kind: "question",
        symptom,
        rule,
        question,
        questionPath,
        progressIndex: questionPath.length,
      };
    }
    if (selectedOption.safetyStop) {
      return {
        kind: "safety-stop",
        symptom,
        title: "Stop here before riding or charging",
        message: selectedOption.resultNote ?? symptom.safetyNote ?? "Stop using the bicycle and seek qualified inspection before proceeding.",
        questionPath,
      };
    }
    if (!selectedOption.nextQuestionId) {
      const recommendations = rankReviewedGuides(
        symptom,
        input.bicycleType,
        selectedOption.recommendedGuideIds,
        guides,
        components,
      );
      return {
        kind: "result",
        symptom,
        rule,
        questionPath,
        resultNote: selectedOption.resultNote ?? "Your answers narrow the next step but do not confirm a cause.",
        recommendations,
      };
    }
    questionId = selectedOption.nextQuestionId;
  }

  return {
    kind: "not-configured",
    symptom,
    message: "This diagnostic flow could not be resolved safely. No cause was inferred. Choose another symptom or ask a qualified mechanic.",
  };
}
