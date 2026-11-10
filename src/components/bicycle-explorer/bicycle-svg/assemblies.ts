/**
 * Shared, type-agnostic assembly builders. Each bicycle profile owns its frame
 * geometry and chooses its equipment; these functions only turn millimetre
 * specifications into SVG-space drawing data and interactive part regions.
 */
import type { ComponentType } from "react";
import type { BikeTypeId } from "@/types/bicycle";
import {
  P, add, chainPath, circleHit, circlePoints, deg, lerp, mul, norm, paddedHull, perp, pitchRadius, polar, polygonHit,
  rad, ringHit, sampleCubic, sectorPolygon, solveChainLoop, strokeHit, sub, svgPolar, tubePolygon, wrapAngle,
  type ChainLoop, type FrameLandmarks, type HitShape, type PartRegion, type Pt, type Transform,
} from "./geometry";
import type { CaliperKind, Tread, TubeSpec } from "./primitives";

/** ISO 622 bead-seat radius shared by 700C and 29-inch wheels (mm). */
export const BEAD_RADIUS_MM = 311;

export type ArtIds = { frame: string; frameShade: string; battery: string };

export type ProfileMetrics = {
  wheelbaseMm: number;
  headAngle: number;
  seatAngle: number;
  stackMm: number;
  reachMm: number;
  chainstayMm: number;
  bbHeightMm: number;
  tireWidthMm: number;
  wheelRadiusMm: number;
};

export type BikeProfile = {
  type: BikeTypeId;
  geometryProfile: string;
  /** Short human description of the representative configuration. */
  subtype: string;
  summary: string;
  /** `data-feature` hooks that must be present in this profile's artwork. */
  features: readonly string[];
  metrics: ProfileMetrics;
  landmarks: { bb: Pt; rearAxle: Pt; frontAxle: Pt; groundY: number };
  wheels: { front: WheelModel; rear: WheelModel };
  drivetrain: DrivetrainModel;
  fork: RigidForkModel | SuspensionForkModel;
  seat: SeatModel;
  /** Named pivots and joints (SVG space) that geometry tests check for connectivity. */
  joints: Record<string, Pt>;
  frameTubes: TubeSpec[];
  /** Fixed points (axles, bottom bracket, pivots) that frame tubes may terminate on. */
  frameNodes: Pt[];
  parts: PartRegion[];
  Art: ComponentType<{ ids: ArtIds }>;
};

export const tubeMm = (t: Transform, name: string, a: Pt, b: Pt, diaA: number, diaB = diaA): TubeSpec => ({
  name,
  a: t.p(a),
  b: t.p(b),
  ra: t.l(diaA) / 2,
  rb: t.l(diaB) / 2,
});

export const tubeHits = (tubes: TubeSpec[], pad = 2.5): HitShape[] =>
  tubes.map((tube) => polygonHit(tubePolygon(tube.a, tube.ra + pad, tube.b, tube.rb + pad)));

/* ------------------------------------------------------------------ */
/* Wheels and brakes                                                   */
/* ------------------------------------------------------------------ */

export type DiscBrakeSpec = { kind: "disc"; rotorMm: number; caliper: CaliperKind; angle: number; mountMm: Pt };
export type RimBrakeSpec = { kind: "rim"; padAngle: number; bodyAngle: number };

export type WheelSpec = {
  axleMm: Pt;
  tireWidthMm: number;
  tireHeightMm: number;
  rimDepthMm: number;
  tread: Tread;
  spokes: number;
  /** Radially laced (front wheels only in practice); otherwise a crossed pattern. */
  radialLacing?: boolean;
  brake: DiscBrakeSpec | RimBrakeSpec;
  /** Visual angle on the tire used as the wheel's verified hit anchor. */
  anchorAngle: number;
  /** Radius (mm) of drivetrain parts painted over the brake (rear cassette). */
  coverRadiusMm?: number;
};

export type DiscBrakeModel = {
  kind: "disc";
  style: CaliperKind;
  rotorR: number;
  caliper: Pt;
  caliperRadius: number;
  mount: Pt;
  length: number;
  depth: number;
};
export type RimBrakeModel = { kind: "rim"; body: Pt; pad: Pt; padLength: number; rimTrackR: number };

export type WheelModel = {
  spec: WheelSpec;
  c: Pt;
  outerR: number;
  beadR: number;
  rimDepth: number;
  hubR: number;
  flangeR: number;
  radiusMm: number;
  brake: DiscBrakeModel | RimBrakeModel;
  wheelPart: PartRegion;
  brakePart: PartRegion;
};

const CALIPER_SIZE: Record<CaliperKind, { length: number; depth: number }> = {
  "flat-mount": { length: 66, depth: 34 },
  "post-mount": { length: 74, depth: 38 },
  "four-piston": { length: 88, depth: 44 },
};

export function buildWheel(t: Transform, name: "front" | "rear", spec: WheelSpec): WheelModel {
  const c = t.p(spec.axleMm);
  const radiusMm = BEAD_RADIUS_MM + spec.tireHeightMm;
  const outerR = t.l(radiusMm);
  const beadR = t.l(BEAD_RADIUS_MM);
  const tireMid = (outerR + beadR) / 2;
  const wheelPart: PartRegion = {
    id: `${name}-wheel`,
    hit: [circleHit(c, outerR + 2)],
    halo: [ringHit(c, tireMid, outerR - beadR + 7), circleHit(c, t.l(26))],
    anchor: svgPolar(c, tireMid, spec.anchorAngle),
  };
  const brakeId = `${name}-brake`;
  let brake: DiscBrakeModel | RimBrakeModel;
  let brakePart: PartRegion;
  if (spec.brake.kind === "disc") {
    const size = CALIPER_SIZE[spec.brake.caliper];
    const rotorMm = spec.brake.rotorMm / 2;
    const rcMm = rotorMm + size.depth * 0.25;
    const innerMm = Math.max(rcMm - size.depth / 2, (spec.coverRadiusMm ?? 0) + 2);
    const outerMm = rcMm + size.depth / 2 + 7;
    const half = deg((size.length / 2 + 6) / rcMm);
    brake = {
      kind: "disc",
      style: spec.brake.caliper,
      rotorR: t.l(rotorMm),
      caliper: svgPolar(c, t.l(rcMm), spec.brake.angle),
      caliperRadius: t.l(rcMm),
      mount: t.p(spec.brake.mountMm),
      length: t.l(size.length),
      depth: t.l(size.depth),
    };
    brakePart = {
      id: brakeId,
      hit: [polygonHit(sectorPolygon(c, t.l(innerMm), t.l(outerMm), spec.brake.angle - half, spec.brake.angle + half))],
      anchor: svgPolar(c, t.l((innerMm + rcMm + size.depth / 2) / 2), spec.brake.angle),
    };
  } else {
    const body = t.p(polar(spec.axleMm, radiusMm + 17, spec.brake.bodyAngle));
    const pad = t.p(polar(spec.axleMm, BEAD_RADIUS_MM - 7, spec.brake.padAngle));
    const padLength = t.l(46);
    const tangent = perp(norm(sub(pad, c)));
    const ends = [add(pad, mul(tangent, padLength / 2)), sub(pad, mul(tangent, padLength / 2))];
    brake = { kind: "rim", body, pad, padLength, rimTrackR: t.l(BEAD_RADIUS_MM - 7) };
    brakePart = { id: brakeId, hit: [polygonHit(paddedHull([body, pad, ...ends], 5))], anchor: lerp(body, pad, 0.55) };
  }
  return {
    spec,
    c,
    outerR,
    beadR,
    rimDepth: t.l(spec.rimDepthMm),
    hubR: t.l(name === "rear" ? 17 : 14),
    flangeR: t.l(name === "rear" ? 27 : 24),
    radiusMm,
    brake,
    wheelPart,
    brakePart,
  };
}

/* ------------------------------------------------------------------ */
/* Drivetrain                                                          */
/* ------------------------------------------------------------------ */

export type DrivetrainSpec = {
  rearAxleMm: Pt;
  /** Chainring teeth; the first ring carries the chain. */
  rings: number[];
  cogs: number[];
  engagedCog: number;
  guideTeeth: number;
  tensionTeeth: number;
  cageMm: number;
  /** Cage swing forward of straight down (degrees). */
  cageAngle: number;
  crankMm: number;
  /** Direction of the drive-side crank (degrees, y-up). */
  crankAngle: number;
  pedal: "flat" | "clipless";
};

type Pulley = { c: Pt; r: number };

export type DrivetrainModel = {
  spec: DrivetrainSpec;
  loop: ChainLoop;
  chainD: string;
  bb: Pt;
  cog: Pt;
  ringRadii: number[];
  cogRadii: number[];
  guide: Pulley;
  tension: Pulley;
  dropout: Pt;
  knuckle: Pt;
  pivot: Pt;
  nearPedal: Pt;
  farPedal: Pt;
  /** Radius (mm) of the largest sprocket including teeth: parts behind it are hidden. */
  coverRadiusMm: number;
  parts: PartRegion[];
};

/** Points along a solved chain loop (SVG), including the wrap arcs. */
export function sampleChainLoop(loop: ChainLoop, t: Transform, stepMm = 14): Pt[] {
  const points: Pt[] = [];
  const n = loop.wheels.length;
  for (let i = 0; i < n; i += 1) {
    const seg = loop.segments[i];
    const wheel = loop.wheels[(i + 1) % n];
    const next = loop.segments[(i + 1) % n];
    points.push(t.p(seg.start), t.p(seg.end));
    const wrap = wrapAngle(wheel, seg.end, next.start);
    const a0 = Math.atan2(seg.end.y - wheel.c.y, seg.end.x - wheel.c.x);
    const steps = Math.max(1, Math.ceil((wrap * wheel.r) / stepMm));
    for (let k = 1; k < steps; k += 1) {
      const a = a0 + ((wheel.clockwise ? -1 : 1) * wrap * k) / steps;
      points.push(t.p(add(wheel.c, P(Math.cos(a) * wheel.r, Math.sin(a) * wheel.r))));
    }
  }
  points.push(points[0]);
  return points;
}

export function buildDrivetrain(t: Transform, s: DrivetrainSpec): DrivetrainModel {
  const ringMm = s.rings.map(pitchRadius);
  const cogMm = s.cogs.map(pitchRadius);
  const engagedMm = pitchRadius(s.engagedCog);
  const guideR = pitchRadius(s.guideTeeth);
  const tensionR = pitchRadius(s.tensionTeeth);
  const guideMm = add(s.rearAxleMm, P(-4, -(engagedMm + 8 + guideR)));
  const tensionMm = add(guideMm, mul(P(Math.sin(rad(s.cageAngle)), -Math.cos(rad(s.cageAngle))), s.cageMm));
  const loop = solveChainLoop([
    { name: "cog", c: s.rearAxleMm, r: engagedMm, clockwise: true },
    { name: "ring", c: P(0, 0), r: ringMm[0], clockwise: true },
    { name: "tension", c: tensionMm, r: tensionR, clockwise: true },
    { name: "guide", c: guideMm, r: guideR, clockwise: false },
  ]);
  const bb = t.p(P(0, 0));
  const cog = t.p(s.rearAxleMm);
  const guide = { c: t.p(guideMm), r: t.l(guideR) };
  const tension = { c: t.p(tensionMm), r: t.l(tensionR) };
  const knuckle = t.p(add(s.rearAxleMm, P(-15, -21)));
  const pivot = t.p(add(guideMm, P(-22, 8)));
  const nearPedal = t.p(polar(P(0, 0), s.crankMm, s.crankAngle));
  const farPedal = t.p(polar(P(0, 0), s.crankMm, s.crankAngle + 180));
  const bigRing = t.l(Math.max(...ringMm));
  const bigCogMm = Math.max(...cogMm);
  const bigCog = t.l(bigCogMm);
  const chainPoints = sampleChainLoop(loop, t);
  const upper = loop.segments[0];
  const parts: PartRegion[] = [
    {
      id: "chain",
      hit: [strokeHit(chainPoints, 8)],
      halo: [strokeHit(chainPoints, 7)],
      anchor: lerp(t.p(upper.start), t.p(upper.end), 0.5),
    },
    {
      id: "cassette",
      hit: [circleHit(cog, bigCog + 2.5)],
      anchor: svgPolar(cog, (t.l(engagedMm) + bigCog) / 2 + 1.5, 135),
    },
    {
      id: "rear-derailleur",
      hit: [polygonHit(paddedHull([knuckle, pivot, ...circlePoints(guide.c, guide.r), ...circlePoints(tension.c, tension.r)], 3))],
      anchor: lerp(guide.c, tension.c, 0.5),
    },
    {
      id: "crankset",
      hit: [circleHit(bb, bigRing + 3), strokeHit([bb, nearPedal], 11)],
      anchor: svgPolar(bb, bigRing - 4, 200),
    },
    {
      id: "pedals",
      hit: [circleHit(nearPedal, 10), circleHit(farPedal, 7)],
      anchor: nearPedal,
    },
  ];
  return {
    spec: s,
    loop,
    chainD: chainPath(loop, t),
    bb,
    cog,
    ringRadii: ringMm.map((r) => t.l(r)),
    cogRadii: cogMm.map((r) => t.l(r)),
    guide,
    tension,
    dropout: cog,
    knuckle,
    pivot,
    nearPedal,
    farPedal,
    coverRadiusMm: bigCogMm + 4,
    parts,
  };
}

/* ------------------------------------------------------------------ */
/* Cockpit                                                             */
/* ------------------------------------------------------------------ */

export type StemModel = { headTop: Pt; steererTop: Pt; clamp: Pt; spacerRings: Pt[]; part: PartRegion };

export function buildStem(t: Transform, f: FrameLandmarks, spacersMm: number): StemModel {
  const headTop = t.p(f.headTop);
  const steererTop = t.p(f.steererTop);
  const clamp = t.p(f.barClamp);
  const spacerRings = Array.from({ length: Math.max(0, Math.round(spacersMm / 10)) }, (_, i) =>
    t.p(add(f.headTop, mul(f.steeringUp, 5 + i * 10))),
  );
  const rSteer = t.l(36) / 2;
  return {
    headTop,
    steererTop,
    clamp,
    spacerRings,
    part: {
      id: "stem",
      hit: [
        polygonHit(tubePolygon(headTop, rSteer + 2.5, steererTop, rSteer + 2.5)),
        polygonHit(tubePolygon(steererTop, rSteer + 2.5, clamp, rSteer + 1)),
      ],
      anchor: lerp(steererTop, clamp, 0.45),
    },
  };
}

export type DropBarModel = {
  barD: string;
  farDropD?: string;
  hoodD: string;
  leverD: string;
  leverTip: Pt;
  shifterPart: PartRegion;
  barPart: PartRegion;
  flared: boolean;
};

/**
 * Drop handlebar in side elevation, relative to the stem clamp. `flare` adds a
 * diverging far-side drop as the side-view cue for flared gravel drops.
 */
export function buildDropBar(t: Transform, clampMm: Pt, o: { reach: number; drop: number; flare: boolean; hoodRise: number }): DropBarModel {
  const q = (x: number, y: number) => t.p(add(clampMm, P(x, y)));
  const { reach: r, drop: d } = o;
  const C = q(0, 0);
  const H = q(r - 22, -4);
  const B1 = q(r + 28, -6);
  const B2 = q(r + 36, -d + 14);
  const D = q(r - 14, -d);
  const E = o.flare ? q(-6, -d + 2) : q(-10, -d + 6);
  const ramp = [C, H];
  const bend = sampleCubic(H, B1, B2, D, 12);
  const fmtP = (p: Pt) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;
  const barD = `M ${fmtP(C)} L ${fmtP(H)} C ${fmtP(B1)} ${fmtP(B2)} ${fmtP(D)} L ${fmtP(E)}`;
  const farDropD = o.flare
    ? `M ${fmtP(q(r + 26, -d * 0.55))} C ${fmtP(q(r + 24, -d + 6))} ${fmtP(q(r - 6, -d - 10))} ${fmtP(q(-20, -d - 16))}`
    : undefined;
  const h = o.hoodRise;
  const hoodPts = [q(r - 32, 2), q(r - 16, 9), q(r + 10, 12 + h * 0.4), q(r + 22, 24 + h), q(r + 30, 20 + h), q(r + 28, 3), q(r + 20, -16), q(r + 4, -22), q(r - 14, -11)];
  const hoodD = `M ${hoodPts.map(fmtP).join(" L ")} Z`;
  const L0 = q(r + 22, -14);
  const L1 = q(r + 38, -38);
  const L2 = q(r + 40, -d * 0.6);
  const leverTip = q(r + 26, -d + 22);
  const leverD = `M ${fmtP(L0)} C ${fmtP(L1)} ${fmtP(L2)} ${fmtP(leverTip)}`;
  const leverPts = sampleCubic(L0, L1, L2, leverTip, 6);
  return {
    barD,
    farDropD,
    hoodD,
    leverD,
    leverTip,
    flared: o.flare,
    shifterPart: { id: "shifters", hit: [polygonHit(paddedHull([...hoodPts, ...leverPts], 3))], anchor: lerp(hoodPts[2], hoodPts[7], 0.5) },
    barPart: { id: "handlebars", hit: [strokeHit([...ramp, ...bend.slice(1), E], 11)], anchor: lerp(D, E, 0.45) },
  };
}

export type FlatBarModel = {
  barD: string;
  grip: [Pt, Pt];
  leverBody: Pt;
  leverTip: Pt;
  pod: Pt;
  podPaddle: Pt;
  shifterPart: PartRegion;
  barPart: PartRegion;
};

/** Flat or riser bar seen from the side: clamp section, rise and backswept grip. */
export function buildFlatBar(t: Transform, clampMm: Pt, o: { rise: number; sweep: number; lever: number }): FlatBarModel {
  const q = (x: number, y: number) => t.p(add(clampMm, P(x, y)));
  const C = q(0, 0);
  const c1 = q(6, o.rise * 0.7);
  const c2 = q(-o.sweep * 0.15, o.rise);
  const G1 = q(-o.sweep * 0.35, o.rise);
  const G2 = q(-o.sweep - 18, o.rise - 3);
  const fmtP = (p: Pt) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;
  const barD = `M ${fmtP(C)} C ${fmtP(c1)} ${fmtP(c2)} ${fmtP(G1)} L ${fmtP(G2)}`;
  const leverBody = q(-o.sweep * 0.2, o.rise + 4);
  const leverTip = q(-o.sweep * 0.2 + o.lever, o.rise - 12);
  const pod = q(-o.sweep * 0.25 + 8, o.rise - 22);
  const podPaddle = q(-o.sweep * 0.25 + 30, o.rise - 34);
  const curve = sampleCubic(C, c1, c2, G1, 6);
  return {
    barD,
    grip: [lerp(G1, G2, 0.25), G2],
    leverBody,
    leverTip,
    pod,
    podPaddle,
    shifterPart: { id: "shifters", hit: [polygonHit(paddedHull([pod, podPaddle], t.l(18)))], anchor: pod },
    barPart: { id: "handlebars", hit: [strokeHit([...curve, G2], 11)], anchor: lerp(G1, G2, 0.7) },
  };
}

/* ------------------------------------------------------------------ */
/* Saddle and seatpost                                                 */
/* ------------------------------------------------------------------ */

const SADDLES = {
  road: { top: 44, points: [[-134, 30], [-122, 42], [-70, 45], [0, 41], [70, 36], [126, 35], [140, 30], [128, 25], [60, 22], [-20, 20], [-100, 21], [-128, 23]] },
  trail: { top: 46, points: [[-128, 28], [-118, 45], [-60, 47], [10, 43], [80, 38], [122, 38], [136, 32], [124, 24], [50, 20], [-40, 18], [-108, 19]] },
  comfort: { top: 56, points: [[-112, 24], [-106, 52], [-60, 58], [0, 54], [60, 42], [100, 37], [112, 30], [98, 20], [20, 14], [-70, 14], [-108, 17]] },
  touring: { top: 50, points: [[-122, 26], [-114, 48], [-60, 52], [4, 47], [70, 38], [114, 36], [126, 30], [112, 22], [40, 17], [-50, 16], [-114, 19]] },
} as const;

export type SaddleStyle = keyof typeof SADDLES;

export type SeatModel = {
  cluster: Pt;
  postBottom: Pt;
  postTop: Pt;
  saddlePoints: Pt[];
  rails: [Pt, Pt];
  style: SaddleStyle;
  seatpostPart: PartRegion;
  saddlePart: PartRegion;
};

export function buildSeat(t: Transform, f: FrameLandmarks, saddleHeightMm: number, style: SaddleStyle, setbackMm = 0): SeatModel {
  const shape = SADDLES[style];
  const postTopMm = mul(f.seatUp, saddleHeightMm - shape.top / f.seatUp.y);
  const origin = add(postTopMm, P(setbackMm, 0));
  const saddlePoints = shape.points.map(([x, y]) => t.p(add(origin, P(x, y))));
  const cluster = t.p(f.seatCluster);
  const postTop = t.p(postTopMm);
  const anchor = t.p(add(origin, P(-10, shape.top - 8)));
  return {
    cluster,
    postBottom: t.p(sub(f.seatCluster, mul(f.seatUp, 25))),
    postTop,
    saddlePoints,
    rails: [t.p(add(origin, P(-62, 10))), t.p(add(origin, P(52, 12)))],
    style,
    seatpostPart: { id: "seatpost", hit: [strokeHit([cluster, postTop], 9)], anchor: lerp(cluster, postTop, 0.42) },
    saddlePart: { id: "saddle", hit: [polygonHit(paddedHull(saddlePoints, 3))], anchor },
  };
}

/* ------------------------------------------------------------------ */
/* Accessories                                                         */
/* ------------------------------------------------------------------ */

export type RackModel = { platform: [Pt, Pt]; struts: [Pt, Pt][]; lightAt: Pt };

/** Rear carrier: platform above the tire, legs to the dropout eyelet and arms to seatstay bosses. */
export function buildRack(t: Transform, f: FrameLandmarks, wheelRadiusMm: number, o: { clearanceMm: number; rearMm: number; frontMm: number }): RackModel {
  const top = f.rearAxle.y + wheelRadiusMm + o.clearanceMm;
  const rearEnd = P(f.rearAxle.x - o.rearMm, top);
  const frontEnd = P(f.rearAxle.x + o.frontMm, top);
  const eyelet = add(f.rearAxle, P(-6, 14));
  const stay = sub(f.seatStayTop, f.rearAxle);
  const boss = add(f.rearAxle, mul(stay, Math.min(0.94, (top - 45 - f.rearAxle.y) / stay.y)));
  return {
    platform: [t.p(rearEnd), t.p(frontEnd)],
    struts: [
      [t.p(lerp(rearEnd, frontEnd, 0.1)), t.p(eyelet)],
      [t.p(lerp(rearEnd, frontEnd, 0.48)), t.p(eyelet)],
      [t.p(frontEnd), t.p(boss)],
    ],
    lightAt: t.p(add(rearEnd, P(-4, -24))),
  };
}

/* ------------------------------------------------------------------ */
/* Forks                                                               */
/* ------------------------------------------------------------------ */

export type RigidForkModel = {
  kind: "rigid";
  crownTop: Pt;
  crown: Pt;
  axle: Pt;
  tip: Pt;
  rTop: number;
  rBottom: number;
  bosses: Pt[];
  part: PartRegion;
};

export function buildRigidFork(t: Transform, f: FrameLandmarks, o: { crownMm: number; topDia: number; tipDia: number; bosses?: boolean }): RigidForkModel {
  const crownTopMm = add(f.headBottom, mul(f.steeringDown, 3));
  const crownMm = add(f.headBottom, mul(f.steeringDown, o.crownMm));
  const along = norm(sub(f.frontAxle, crownMm));
  const tipMm = add(f.frontAxle, mul(along, 12));
  const crownTop = t.p(crownTopMm);
  const crown = t.p(crownMm);
  const axle = t.p(f.frontAxle);
  const rTop = t.l(o.topDia) / 2;
  const rBottom = t.l(o.tipDia) / 2;
  const bosses = o.bosses ? [0.4, 0.5, 0.6].map((k) => t.p(lerp(crownMm, f.frontAxle, k))) : [];
  return {
    kind: "rigid",
    crownTop,
    crown,
    axle,
    tip: t.p(tipMm),
    rTop,
    rBottom,
    bosses,
    part: {
      id: "fork",
      hit: [polygonHit(tubePolygon(crownTop, rTop + 3, axle, rBottom + 3))],
      anchor: lerp(crown, axle, 0.42),
    },
  };
}

export type SuspensionForkModel = {
  kind: "suspension";
  steerer: Pt;
  crownTop: Pt;
  legTop: Pt;
  seal: Pt;
  lowerBottom: Pt;
  axle: Pt;
  archD: string;
  rStanchion: number;
  rLower: number;
  crownD: string;
  postMount: Pt;
  /** Visible stanchion length (mm) between the seals and the crown at full extension. */
  exposedMm: number;
  part: PartRegion;
};

/**
 * Telescopic fork: crown offset ahead of the steering axis, stanchions parallel
 * to the steering axis, lowers ending at the axle and a front arch. The seals
 * sit `sealClearanceMm` beyond the tire so the arch bridges over the tread
 * instead of cutting through it; the remaining leg length is exposed stanchion.
 */
export function buildSuspensionFork(
  t: Transform,
  f: FrameLandmarks,
  o: { stanchionDia: number; lowerDia: number; wheelRadiusMm: number; sealClearanceMm: number; crownDepth: number },
): SuspensionForkModel {
  const up = f.steeringUp;
  const steererMm = add(f.headBottom, mul(f.steeringDown, 14));
  const legLength = (steererMm.x - f.frontAxle.x) * up.x + (steererMm.y - f.frontAxle.y) * up.y;
  const legTopMm = add(f.frontAxle, mul(up, legLength));
  const sealAlong = o.wheelRadiusMm + o.sealClearanceMm;
  const sealMm = add(f.frontAxle, mul(up, sealAlong));
  const forward = perp(mul(up, -1));
  const rLowerMm = o.lowerDia / 2;
  const archTop = add(sealMm, add(mul(up, -6), mul(forward, rLowerMm)));
  const archPeak = add(sealMm, add(mul(up, -22), mul(forward, rLowerMm + 22)));
  const archLow = add(sealMm, add(mul(up, -72), mul(forward, rLowerMm)));
  const archInner = add(sealMm, add(mul(up, -32), mul(forward, rLowerMm + 5)));
  const crownPts = [
    add(steererMm, add(mul(up, o.crownDepth * 0.55), mul(forward, -24))),
    add(legTopMm, add(mul(up, o.crownDepth * 0.5), mul(forward, 10))),
    add(legTopMm, add(mul(up, -o.crownDepth * 0.5), mul(forward, 28))),
    add(legTopMm, add(mul(up, -o.crownDepth * 0.6), mul(forward, -14))),
    add(steererMm, add(mul(up, -o.crownDepth * 0.45), mul(forward, -22))),
  ];
  const fmtP = (p: Pt) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;
  const crownSvg = crownPts.map((p) => t.p(p));
  const archD = `M ${fmtP(t.p(archTop))} Q ${fmtP(t.p(add(archPeak, mul(up, 30))))} ${fmtP(t.p(archPeak))} Q ${fmtP(t.p(add(archPeak, mul(up, -34))))} ${fmtP(t.p(archLow))} L ${fmtP(t.p(archInner))} Z`;
  const legTop = t.p(legTopMm);
  const lowerBottom = t.p(add(f.frontAxle, mul(up, -16)));
  const rStanchion = t.l(o.stanchionDia) / 2;
  const rLower = t.l(o.lowerDia) / 2;
  return {
    kind: "suspension",
    steerer: t.p(steererMm),
    crownTop: t.p(f.headBottom),
    legTop,
    seal: t.p(sealMm),
    lowerBottom,
    axle: t.p(f.frontAxle),
    archD,
    rStanchion,
    rLower,
    crownD: `M ${crownSvg.map(fmtP).join(" L ")} Z`,
    postMount: t.p(add(f.frontAxle, add(mul(up, 70), mul(forward, -rLowerMm)))),
    part: {
      id: "fork",
      hit: [
        polygonHit(paddedHull(crownSvg, 2)),
        polygonHit(tubePolygon(legTop, rLower + 3, lowerBottom, rLower + 3)),
        polygonHit(paddedHull([t.p(archTop), t.p(archPeak), t.p(archLow)], 3)),
      ],
      anchor: t.p(add(f.frontAxle, mul(up, sealAlong * 0.55))),
    },
    exposedMm: legLength - sealAlong,
  };
}
