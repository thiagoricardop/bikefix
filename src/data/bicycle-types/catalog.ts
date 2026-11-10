import type { BikeTypeId, BicycleTypeDefinition, SvgRegionMapping } from "@/types/bicycle";

const commonParts = [
  "front-wheel", "rear-wheel", "front-brake", "rear-brake", "frame", "fork", "handlebars", "stem",
  "saddle", "seatpost", "chain", "cassette", "rear-derailleur", "crankset", "pedals", "shifters",
];

function mappings(type: BikeTypeId, componentIds: string[], optionalComponentIds: string[] = []): SvgRegionMapping[] {
  return [...componentIds, ...optionalComponentIds].map((componentId) => ({
    regionId: `${type}-${componentId}`,
    componentId,
  }));
}

export const BICYCLE_TYPES: BicycleTypeDefinition[] = [
  {
    id: "road",
    name: "Road bike",
    shortDescription: "Drop bars and a slim, efficient silhouette.",
    illustrationDescription: "A representative endurance road bicycle with narrow slick tires, a rigid fork, drop handlebars with brake/shift hoods, dual-pivot rim brakes and a double chainring.",
    componentIds: [...commonParts],
    optionalComponentIds: [],
    svgRegionMappings: mappings("road", commonParts),
    visualNotes: ["The drawing shows rim brakes; many current road bikes use disc brakes instead.", "Tire width and gearing vary by model."],
  },
  {
    id: "mountain",
    name: "Mountain bike",
    shortDescription: "Wider tires, flat bars, and trail-oriented control.",
    illustrationDescription: "A representative 29-inch full-suspension trail mountain bike with knobby tires, a telescopic suspension fork, a generic four-bar rear linkage driving a rocker-mounted shock, a 1× drivetrain, dropper post and four-piston disc brakes.",
    componentIds: [...commonParts, "rear-suspension"],
    optionalComponentIds: ["rear-suspension"],
    svgRegionMappings: mappings("mountain", commonParts, ["rear-suspension"]),
    visualNotes: ["The example shows full suspension; many mountain bikes are hardtails.", "The rear linkage is a generic four-bar layout; real suspension designs differ by manufacturer.", "Brake and drivetrain systems must be identified separately."],
  },
  {
    id: "hybrid",
    name: "Hybrid / commuter",
    shortDescription: "A practical everyday setup with a flat handlebar.",
    illustrationDescription: "A representative upright hybrid commuter with a flat handlebar, rigid fork, medium-width tires, disc brakes, a 1× drivetrain and optional full fenders, rear rack and rear light.",
    componentIds: [...commonParts],
    optionalComponentIds: [],
    svgRegionMappings: mappings("hybrid", commonParts),
    visualNotes: ["Fenders, rack and light are shown as optional commuter fittings and are not separately selectable.", "Some commuter bikes have hub gears, rim brakes, or suspension not shown here.", "The illustration is a representative example, not a model-specific specification."],
  },
  {
    id: "gravel",
    name: "Gravel bike",
    shortDescription: "Drop bars and wider tires for mixed terrain.",
    illustrationDescription: "A representative gravel bicycle with flared drop bars, wide tires with visible clearance, a rigid fork with mounting bosses, a 1× drivetrain and flat-mount disc brakes.",
    componentIds: [...commonParts],
    optionalComponentIds: [],
    svgRegionMappings: mappings("gravel", commonParts),
    visualNotes: ["Tire clearance, drivetrain and brake configurations vary.", "The illustration is representative, not a model-specific specification."],
  },
  {
    id: "ebike",
    name: "E-bike",
    shortDescription: "An assisted bicycle with additional electrical components.",
    illustrationDescription: "A representative mid-drive trekking/commuter e-bike with a battery mounted along the down tube, a drive unit at the bottom bracket, suspension fork, handlebar display, lights, rack and fenders.",
    componentIds: [...commonParts, "battery", "motor"],
    optionalComponentIds: ["battery", "motor"],
    svgRegionMappings: mappings("ebike", commonParts, ["battery", "motor"]),
    visualNotes: ["Battery and motor placement vary by system; electrical layouts differ by manufacturer.", "Do not open battery packs or attempt unsupported electrical repairs.", "Mechanical components may still require the same compatibility checks as non-electric bicycles."],
  },
];

export const BICYCLE_TYPE_BY_ID = Object.fromEntries(BICYCLE_TYPES.map((type) => [type.id, type])) as Record<BikeTypeId, BicycleTypeDefinition>;

export function getBicycleType(id: BikeTypeId): BicycleTypeDefinition {
  return BICYCLE_TYPE_BY_ID[id];
}
