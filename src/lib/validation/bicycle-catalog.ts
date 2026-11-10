import {
  bicycleComponentSchema,
  bicycleTypeDefinitionSchema,
  type BicycleComponent,
  type BicycleTypeDefinition,
} from "@/types/bicycle";

export type CatalogIssue = { code: string; message: string };

/** Validate schema shape and cross-record relationships without requiring a database. */
export function validateBicycleCatalog(
  components: BicycleComponent[],
  bicycleTypes: BicycleTypeDefinition[],
): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const componentIds = new Set<string>();
  const typeIds = new Set<string>();

  for (const [index, value] of components.entries()) {
    const parsed = bicycleComponentSchema.safeParse(value);
    if (!parsed.success) {
      issues.push({ code: "invalid-component", message: `Component at index ${index} is invalid: ${parsed.error.issues.map((item) => item.message).join("; ")}` });
      continue;
    }
    if (componentIds.has(value.id)) issues.push({ code: "duplicate-component", message: `Duplicate component ID: ${value.id}` });
    componentIds.add(value.id);
  }

  for (const [index, value] of bicycleTypes.entries()) {
    const parsed = bicycleTypeDefinitionSchema.safeParse(value);
    if (!parsed.success) {
      issues.push({ code: "invalid-bicycle-type", message: `Bicycle type at index ${index} is invalid: ${parsed.error.issues.map((item) => item.message).join("; ")}` });
      continue;
    }
    if (typeIds.has(value.id)) issues.push({ code: "duplicate-bicycle-type", message: `Duplicate bicycle type ID: ${value.id}` });
    typeIds.add(value.id);
  }

  const componentById = new Map(components.map((component) => [component.id, component]));
  for (const component of components) {
    if (component.parentId && !componentById.has(component.parentId)) {
      issues.push({ code: "missing-parent", message: `${component.id} references missing parent ${component.parentId}` });
    } else if (component.parentId) {
      const parent = componentById.get(component.parentId);
      if (parent && !parent.childIds.includes(component.id)) {
        issues.push({ code: "parent-child-mismatch", message: `${component.id} names ${component.parentId} as parent, but the parent's childIds omit it` });
      }
    }
    for (const childId of component.childIds) {
      const child = componentById.get(childId);
      if (!child) issues.push({ code: "missing-child", message: `${component.id} references missing child ${childId}` });
      else if (child.parentId !== component.id) issues.push({ code: "child-parent-mismatch", message: `${component.id} lists ${childId} as a child, but its parentId does not match` });
    }
    for (const guideId of component.guideIds) {
      if (!guideId.trim()) issues.push({ code: "empty-guide-reference", message: `${component.id} contains an empty guide reference` });
    }
  }

  // A component tree should not contain parent cycles.
  for (const component of components) {
    const visited = new Set<string>();
    let cursor: BicycleComponent | undefined = component;
    while (cursor?.parentId) {
      if (visited.has(cursor.id)) {
        issues.push({ code: "component-cycle", message: `A parent cycle includes ${cursor.id}` });
        break;
      }
      visited.add(cursor.id);
      cursor = componentById.get(cursor.parentId);
    }
  }

  for (const type of bicycleTypes) {
    const referenced = [...type.componentIds, ...type.optionalComponentIds];
    for (const id of referenced) {
      if (!componentById.has(id)) issues.push({ code: "missing-type-component", message: `${type.id} references missing component ${id}` });
    }
    const regionIds = new Set<string>();
    const mappedComponents = new Set<string>();
    for (const mapping of type.svgRegionMappings) {
      if (regionIds.has(mapping.regionId)) issues.push({ code: "duplicate-svg-region", message: `${type.id} has duplicate SVG region ID ${mapping.regionId}` });
      regionIds.add(mapping.regionId);
      if (!componentById.has(mapping.componentId)) issues.push({ code: "missing-mapped-component", message: `${type.id} SVG region ${mapping.regionId} maps to missing component ${mapping.componentId}` });
      else if (componentById.get(mapping.componentId)?.kind !== "part") issues.push({ code: "group-svg-region", message: `${type.id} SVG region ${mapping.regionId} maps to a group instead of a physical part` });
      if (!referenced.includes(mapping.componentId)) issues.push({ code: "unavailable-mapped-component", message: `${type.id} maps ${mapping.componentId}, but it is not listed as present or optional` });
      mappedComponents.add(mapping.componentId);
    }
    for (const id of referenced) {
      if (componentById.get(id)?.kind === "part" && !mappedComponents.has(id)) {
        issues.push({ code: "unmapped-component", message: `${type.id} includes physical component ${id} without an SVG region mapping` });
      }
    }
  }

  return issues;
}
