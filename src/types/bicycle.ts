import { z } from "zod";

export const bicycleTypeIdSchema = z.enum(["road", "mountain", "hybrid", "gravel", "ebike"]);
export const explorerBicycleTypeSchema = z.union([bicycleTypeIdSchema, z.literal("unsure")]);
export const componentKindSchema = z.enum(["group", "part"]);

export const bicycleComponentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "Use a stable kebab-case identifier."),
  name: z.string().min(1),
  shortName: z.string().min(1),
  kind: componentKindSchema,
  category: z.string().min(1),
  parentId: z.string().optional(),
  childIds: z.array(z.string()),
  description: z.string().min(1),
  commonSymptoms: z.array(z.string()),
  guideIds: z.array(z.string()),
});

export const svgRegionMappingSchema = z.object({
  regionId: z.string().min(1),
  componentId: z.string().min(1),
});

export const bicycleTypeDefinitionSchema = z.object({
  id: bicycleTypeIdSchema,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  illustrationDescription: z.string().min(1),
  componentIds: z.array(z.string()),
  optionalComponentIds: z.array(z.string()),
  svgRegionMappings: z.array(svgRegionMappingSchema),
  visualNotes: z.array(z.string()),
});

export type BikeTypeId = z.infer<typeof bicycleTypeIdSchema>;
export type ExplorerBicycleType = z.infer<typeof explorerBicycleTypeSchema>;
export type ComponentKind = z.infer<typeof componentKindSchema>;
export type BicycleComponent = z.infer<typeof bicycleComponentSchema>;
export type SvgRegionMapping = z.infer<typeof svgRegionMappingSchema>;
export type BicycleTypeDefinition = z.infer<typeof bicycleTypeDefinitionSchema>;
