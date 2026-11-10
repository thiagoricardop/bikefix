import type { BicycleComponent } from "@/types/bicycle";

/**
 * Shared domain IDs. Keep these independent of SVG geometry so one repair topic
 * can be reused across bicycle variants without duplicating content.
 */
export const BICYCLE_COMPONENTS: BicycleComponent[] = [
  {
    id: "wheels", name: "Wheels", shortName: "Wheels", kind: "group", category: "Wheels & tires",
    childIds: ["front-wheel", "rear-wheel"], description: "The wheel assemblies support the bicycle and keep it rolling.",
    commonSymptoms: ["Wheel wobble", "Rubbing", "Unusual wheel noise"], guideIds: ["flat-tire-inner-tube", "inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "front-wheel", name: "Front wheel", shortName: "Front wheel", kind: "part", category: "Wheels & tires", parentId: "wheels",
    childIds: [], description: "The front wheel includes the tire, rim, spokes, hub, and axle area. The exact assembly varies by bicycle.",
    commonSymptoms: ["Front tire is flat", "Wheel rubs", "Wheel wobbles", "Unusual clicking"], guideIds: ["flat-tire-inner-tube", "inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "rear-wheel", name: "Rear wheel", shortName: "Rear wheel", kind: "part", category: "Wheels & tires", parentId: "wheels",
    childIds: [], description: "The rear wheel supports the drivetrain and braking system. The cassette, freewheel, or hub configuration must be identified before system-specific work.",
    commonSymptoms: ["Rear tire is flat", "Wheel rubs", "Wheel wobbles", "Noise while pedaling"], guideIds: ["flat-tire-inner-tube", "inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing", "rear-derailleur-indexing"],
  },
  {
    id: "brakes", name: "Brakes", shortName: "Brakes", kind: "group", category: "Brakes",
    childIds: ["front-brake", "rear-brake"], description: "The braking system slows the bicycle. This illustration does not determine whether your bicycle uses rim, mechanical disc, or hydraulic disc brakes.",
    commonSymptoms: ["Weak braking", "Rubbing", "Squealing", "Brake lever feels unusual"], guideIds: ["inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "front-brake", name: "Front brake", shortName: "Front brake", kind: "part", category: "Brakes", parentId: "brakes",
    childIds: [], description: "The front braking assembly. Identify the actual brake type and inspect for damage before choosing an adjustment procedure.",
    commonSymptoms: ["Front brake rubs", "Weak front braking", "Squealing", "Lever travel changed"], guideIds: ["inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "rear-brake", name: "Rear brake", shortName: "Rear brake", kind: "part", category: "Brakes", parentId: "brakes",
    childIds: [], description: "The rear braking assembly. Correct procedures depend on the installed brake system and its condition.",
    commonSymptoms: ["Rear brake rubs", "Weak rear braking", "Squealing", "Lever travel changed"], guideIds: ["inspect-front-brake-rub", "adjust-mechanical-disc-brake-rub", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "drivetrain", name: "Drivetrain", shortName: "Drivetrain", kind: "group", category: "Gears & drivetrain",
    childIds: ["chain", "cassette", "rear-derailleur", "crankset", "shifters"], description: "The drivetrain transfers pedaling force and, where fitted, changes gear ratios.",
    commonSymptoms: ["Gears skip", "Chain drops", "Clicking while pedaling", "Shifting feels slow"], guideIds: ["rear-derailleur-indexing", "clean-lubricate-chain"],
  },
  {
    id: "chain", name: "Chain", shortName: "Chain", kind: "part", category: "Gears & drivetrain", parentId: "drivetrain",
    childIds: [], description: "The chain transfers force between the crankset and the rear sprockets. Wear, contamination, damage, and compatibility can affect operation.",
    commonSymptoms: ["Chain skips", "Chain falls off", "Rust or grime", "Noise while pedaling"], guideIds: ["rear-derailleur-indexing", "clean-lubricate-chain"],
  },
  {
    id: "cassette", name: "Cassette / rear sprockets", shortName: "Cassette", kind: "part", category: "Gears & drivetrain", parentId: "drivetrain",
    childIds: [], description: "The rear sprockets work with the chain and shifting system. Some bicycles use a freewheel or an internal-gear hub instead.",
    commonSymptoms: ["Skipping under load", "Uneven shifting", "Visible tooth damage"], guideIds: ["rear-derailleur-indexing", "clean-lubricate-chain"],
  },
  {
    id: "rear-derailleur", name: "Rear derailleur", shortName: "Rear derailleur", kind: "part", category: "Gears & drivetrain", parentId: "drivetrain",
    childIds: [], description: "On a derailleur-equipped bicycle, this mechanism moves the chain between rear sprockets. Not all bicycles use a rear derailleur.",
    commonSymptoms: ["Gears skip", "Slow shifting", "Chain rubs", "Derailleur appears bent"], guideIds: ["rear-derailleur-indexing", "clean-lubricate-chain"],
  },
  {
    id: "crankset", name: "Crankset", shortName: "Crankset", kind: "part", category: "Gears & drivetrain", parentId: "drivetrain",
    childIds: ["pedals"], description: "The crank arms and chainring(s) turn as you pedal. Loose or damaged parts require careful inspection.",
    commonSymptoms: ["Clicking while pedaling", "Crank feels loose", "Chainring rubs"], guideIds: ["clean-lubricate-chain"],
  },
  {
    id: "pedals", name: "Pedals", shortName: "Pedals", kind: "part", category: "Gears & drivetrain", parentId: "crankset",
    childIds: [], description: "Pedals connect your feet to the crank arms. Thread direction and pedal compatibility matter during removal or installation.",
    commonSymptoms: ["Pedal clicks", "Pedal feels loose", "Pedal does not turn smoothly"], guideIds: [],
  },
  {
    id: "shifters", name: "Shifters", shortName: "Shifters", kind: "part", category: "Gears & drivetrain", parentId: "drivetrain",
    childIds: [], description: "Shifters command gear changes. The control style and cable or electronic system vary between bicycles.",
    commonSymptoms: ["Gear will not change", "Shifter feels stuck", "Shifting is inconsistent"], guideIds: ["rear-derailleur-indexing"],
  },
  {
    id: "cockpit", name: "Handlebars & controls", shortName: "Cockpit", kind: "group", category: "Handlebars & fit",
    childIds: ["handlebars", "stem"], description: "The cockpit includes steering controls and the parts that connect the handlebars to the bicycle.",
    commonSymptoms: ["Handlebars feel loose", "Steering feels unusual", "Riding position feels uncomfortable"], guideIds: ["assess-handlebar-stem-position"],
  },
  {
    id: "handlebars", name: "Handlebars", shortName: "Handlebars", kind: "part", category: "Handlebars & fit", parentId: "cockpit",
    childIds: [], description: "Handlebars control steering and support the brake and shift controls. Loose or damaged bars are safety-critical.",
    commonSymptoms: ["Bars rotate", "Controls move", "Cracked or damaged bar"], guideIds: ["assess-handlebar-stem-position"],
  },
  {
    id: "stem", name: "Stem", shortName: "Stem", kind: "part", category: "Handlebars & fit", parentId: "cockpit",
    childIds: [], description: "The stem connects the handlebars to the steerer. Fastener specifications are model-specific and must not be guessed.",
    commonSymptoms: ["Handlebars are misaligned", "Stem moves", "Steering feels loose"], guideIds: ["assess-handlebar-stem-position"],
  },
  {
    id: "frame", name: "Frame", shortName: "Frame", kind: "part", category: "Frame & fit",
    childIds: ["rear-suspension"], description: "The frame is the bicycle's main structure. Cracks, dents around critical joints, or structural damage require professional assessment.",
    commonSymptoms: ["Visible crack or dent", "Unusual creaking", "Loose accessory or mount"], guideIds: ["set-saddle-height", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "fork", name: "Front fork", shortName: "Fork", kind: "part", category: "Frame & fit",
    childIds: [], description: "The fork holds the front wheel. It may be rigid or contain suspension; the drawing is schematic and does not determine its actual system.",
    commonSymptoms: ["Front end feels loose", "Visible damage", "Suspension behaves unusually"], guideIds: ["assess-handlebar-stem-position", "assess-wheel-wobble-rubbing"],
  },
  {
    id: "saddle", name: "Saddle", shortName: "Saddle", kind: "part", category: "Frame & fit", parentId: "seatpost",
    childIds: [], description: "The saddle is the bicycle seat. Its position and fastening system vary by bicycle.",
    commonSymptoms: ["Saddle slips", "Saddle tilts", "Riding position is uncomfortable"], guideIds: ["set-saddle-height"],
  },
  {
    id: "seatpost", name: "Seatpost", shortName: "Seatpost", kind: "part", category: "Frame & fit",
    childIds: ["saddle"], description: "The seatpost supports the saddle. Observe minimum insertion requirements and manufacturer torque specifications when adjusting it.",
    commonSymptoms: ["Saddle height changes", "Seatpost slips", "Seatpost creaks"], guideIds: ["set-saddle-height"],
  },
  {
    id: "rear-suspension", name: "Rear suspension", shortName: "Rear shock", kind: "part", category: "Suspension", parentId: "frame",
    childIds: [], description: "Some mountain bikes have a rear shock; many bicycles do not. Suspension setup is model-specific and may require specialist knowledge.",
    commonSymptoms: ["Suspension feels unusually soft", "Oil or air loss suspected", "Unusual suspension noise"], guideIds: [],
  },
  {
    id: "electric-system", name: "Electric assist system", shortName: "E-assist", kind: "group", category: "Electric assist",
    childIds: ["battery", "motor"], description: "E-bikes use different battery and drive layouts. Follow the bicycle and system manufacturer's safety instructions.",
    commonSymptoms: ["Assist is unavailable", "Display warning", "Battery will not charge"], guideIds: [],
  },
  {
    id: "battery", name: "Battery", shortName: "Battery", kind: "part", category: "Electric assist", parentId: "electric-system",
    childIds: [], description: "Battery location, removal, charging, and service requirements vary. Do not open a battery pack or work on damaged battery cells.",
    commonSymptoms: ["Battery will not charge", "Range changed noticeably", "Visible battery damage"], guideIds: [],
  },
  {
    id: "motor", name: "Motor / drive unit", shortName: "Motor", kind: "part", category: "Electric assist", parentId: "electric-system",
    childIds: [], description: "The electric drive system is manufacturer-specific. Mechanical bicycle maintenance must be separated from electrical or motor-system repair.",
    commonSymptoms: ["Assist does not engage", "Unusual motor noise", "System warning"], guideIds: [],
  },
];

export const COMPONENT_BY_ID = Object.fromEntries(BICYCLE_COMPONENTS.map((component) => [component.id, component])) as Record<string, BicycleComponent>;
export function getComponent(id: string): BicycleComponent | undefined {
  return COMPONENT_BY_ID[id];
}
