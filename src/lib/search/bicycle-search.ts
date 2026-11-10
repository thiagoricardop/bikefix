import { getBicycleType } from "@/data/bicycle-types/catalog";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { SYMPTOMS } from "@/data/symptoms/catalog";
import type { BikeTypeId } from "@/types/bicycle";
import type { BicycleComponent } from "@/types/bicycle";
import type { Symptom } from "@/types/domain";

export type ComponentSearchMatch = {
  component: BicycleComponent;
  score: number;
};

export type SymptomSearchMatch = {
  symptom: Symptom;
  /** Only components actually represented by the currently selected variant. */
  componentIds: string[];
  score: number;
};

export type BicycleSearchResults = {
  components: ComponentSearchMatch[];
  symptoms: SymptomSearchMatch[];
};

/** Normalize ordinary rider language without depending on browser locale or an AI service. */
export function normalizeBicycleSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘']/g, "")
    .replace(/e\s*-\s*bike/g, "ebike")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreFields(query: string, fields: string[]): number {
  const normalizedQuery = normalizeBicycleSearchText(query);
  if (!normalizedQuery) return 0;

  const normalizedFields = fields.map(normalizeBicycleSearchText).filter(Boolean);
  if (normalizedFields.some((field) => field === normalizedQuery)) return 100;
  if (normalizedFields.some((field) => field.startsWith(normalizedQuery))) return 85;
  if (normalizedFields.some((field) => field.includes(normalizedQuery))) return 70;

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  const combined = normalizedFields.join(" ");
  if (queryWords.length > 0 && queryWords.every((word) => combined.includes(word))) return 45;
  return 0;
}

function symptomIsCompatible(symptom: Symptom, bikeType: BikeTypeId, availablePartIds: Set<string>): boolean {
  if (symptom.bicycleTypes && !symptom.bicycleTypes.includes(bikeType)) return false;
  return symptom.componentIds.some((componentId) => availablePartIds.has(componentId));
}

/**
 * Local, deterministic discovery across components and the structured symptom vocabulary.
 * Results are restricted to parts represented by the chosen bicycle variant; symptom aliases
 * are searchable, but a match is never presented as a diagnosis.
 */
export function searchBicycleCatalog(query: string, bikeType: BikeTypeId): BicycleSearchResults {
  const normalizedQuery = normalizeBicycleSearchText(query);
  const bicycle = getBicycleType(bikeType);
  const availablePartIds = new Set(
    bicycle.componentIds.filter((componentId) => BICYCLE_COMPONENTS.some((component) => component.id === componentId && component.kind === "part")),
  );
  const compatibleSymptoms = SYMPTOMS.filter((symptom) => symptomIsCompatible(symptom, bikeType, availablePartIds));

  const components = BICYCLE_COMPONENTS
    .filter((component) => component.kind === "part" && availablePartIds.has(component.id))
    .map((component) => {
      const linkedSymptomFields = compatibleSymptoms
        .filter((symptom) => symptom.componentIds.includes(component.id))
        .flatMap((symptom) => [symptom.title, symptom.description, ...symptom.aliases]);
      const fields = [
        component.name,
        component.shortName,
        component.category,
        component.description,
        ...component.commonSymptoms,
        ...linkedSymptomFields,
      ];
      return { component, score: normalizedQuery ? scoreFields(normalizedQuery, fields) : 1 };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name));

  const symptoms = compatibleSymptoms
    .map((symptom) => {
      const componentIds = symptom.componentIds.filter((componentId) => availablePartIds.has(componentId));
      const componentNames = componentIds.flatMap((componentId) => {
        const component = BICYCLE_COMPONENTS.find((entry) => entry.id === componentId);
        return component ? [component.name] : [];
      });
      const score = normalizedQuery
        ? scoreFields(normalizedQuery, [symptom.title, symptom.description, ...symptom.aliases, ...componentNames])
        : 0;
      return { symptom, componentIds, score };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.symptom.title.localeCompare(b.symptom.title));

  return { components, symptoms };
}
