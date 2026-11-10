/**
 * Road bicycle — representative endurance road geometry (aluminium/carbon,
 * 700×28C slick tires, rigid fork, drop bar, 2× drivetrain, dual-pivot rim
 * caliper brakes). Many current road bikes use disc brakes instead.
 */
import {
  BEAD_RADIUS_MM, buildDrivetrain, buildDropBar, buildRigidFork, buildSeat, buildStem, buildWheel, tubeHits, tubeMm,
  type ArtIds, type BikeProfile,
} from "../assemblies";
import {
  ChainArt, ChainringArt, DerailleurArt, DropBarArt, FarCrankArt, NearCrankArt, RearDrivetrainArt, RigidForkArt, RimBrakeArt,
  RimTrack, SaddleArt, SeatpostArt, StemArt, WheelArt,
} from "../assembly-art";
import { P, add, angleOf, lerp, makeTransform, mul, orderParts, pitchRadius, polar, solveFrame, sub, tubePath } from "../geometry";
import { Bolt, FrameMember, INK, TubeHighlight } from "../primitives";

const TIRE = { width: 28, height: 27 };
const R = BEAD_RADIUS_MM + TIRE.height;
const GEOMETRY = { stack: 585, reach: 383, headAngle: 71.9, seatAngle: 73.3, chainstay: 420, bbDrop: 78 };

const f = solveFrame({
  ...GEOMETRY,
  headTube: 165,
  forkOffset: 48,
  wheelRadius: R,
  seatTube: 520,
  topTubeJoin: 500,
  seatStayJoin: 480,
  saddleHeight: 725,
  topTubeBelowHeadTop: 18,
  downTubeAboveHeadBottom: 30,
  spacers: 25,
  stemLength: 100,
  stemAngle: -6,
});
const t = makeTransform(f.groundY, f.rearAxle.x - R, f.frontAxle.x + R);

const drive = buildDrivetrain(t, {
  rearAxleMm: f.rearAxle,
  rings: [50, 34],
  cogs: [11, 12, 13, 14, 16, 18, 20, 22, 25, 28, 32],
  engagedCog: 18,
  guideTeeth: 11,
  tensionTeeth: 11,
  cageMm: 62,
  cageAngle: 26,
  crankMm: 172.5,
  crankAngle: -55,
  pedal: "clipless",
});

const forkCrownMm = add(f.headBottom, mul(f.steeringDown, 30));
const crownAngle = angleOf(sub(forkCrownMm, f.frontAxle));
const seatStayAngle = angleOf(sub(f.seatStayTop, f.rearAxle));
const bridgeMm = polar(f.rearAxle, R + 14, seatStayAngle);

const front = buildWheel(t, "front", {
  axleMm: f.frontAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 30,
  tread: "slick",
  spokes: 20,
  radialLacing: true,
  brake: { kind: "rim", bodyAngle: crownAngle - 4.5, padAngle: crownAngle - 4 },
  anchorAngle: -35,
});
const rear = buildWheel(t, "rear", {
  axleMm: f.rearAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 30,
  tread: "slick",
  spokes: 24,
  brake: { kind: "rim", bodyAngle: seatStayAngle + 4.5, padAngle: seatStayAngle + 5 },
  anchorAngle: 215,
});

const fork = buildRigidFork(t, f, { crownMm: 30, topDia: 34, tipDia: 15 });
const stem = buildStem(t, f, 25);
const bar = buildDropBar(t, f.barClamp, { reach: 80, drop: 125, flare: false, hoodRise: 4 });
const seat = buildSeat(t, f, 725, "road");

const tubes = [
  tubeMm(t, "chainstay", f.rearAxle, P(-4, 4), 16, 24),
  tubeMm(t, "seatstay", f.rearAxle, f.seatStayTop, 13, 17),
  tubeMm(t, "seat-tube", P(0, 0), add(f.seatCluster, mul(f.seatUp, 14)), 34, 31),
  tubeMm(t, "down-tube", P(10, 8), f.downTubeFront, 52, 46),
  tubeMm(t, "top-tube", f.topTubeRear, f.topTubeFront, 30, 34),
  tubeMm(t, "head-tube", add(f.headTop, mul(f.steeringUp, 6)), add(f.headBottom, mul(f.steeringDown, 4)), 44, 54),
  tubeMm(t, "bb-shell", P(0, -0.5), P(0, 0.5), 46),
  tubeMm(t, "dropout", sub(f.rearAxle, P(0, 0.5)), add(f.rearAxle, P(0, 0.5)), 24),
];

/** Front derailleur on the seat tube: decorative, not a selectable catalog component. */
function FrontDerailleur() {
  const ringR = pitchRadius(50);
  const clamp = t.p(mul(f.seatUp, ringR + 36));
  const body = t.p(add(mul(f.seatUp, ringR + 22), P(-14, 0)));
  const inner = [96, 104, 112, 120, 128].map((a) => t.p(polar(P(0, 0), ringR + 7, a)));
  const outer = [128, 120, 112, 104, 96].map((a) => t.p(polar(P(0, 0), ringR + 19, a)));
  const cage = `M ${[...inner, ...outer].map((p) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`).join(" L ")} Z`;
  return (
    <g data-feature="front-derailleur">
      <path d={tubePath(clamp, 5.2, body, 4)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <path d={cage} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} strokeLinejoin="round" />
      <Bolt c={clamp} r={1.6} />
    </g>
  );
}

function RoadArt({ ids }: { ids: ArtIds }) {
  const paint = `url(#${ids.frame})`;
  return (
    <g data-feature="road-geometry">
      <FarCrankArt d={drive} />
      <WheelArt w={rear} feature="rear-wheel-assembly" front={<RimTrack w={rear} />} />
      <WheelArt w={front} feature="front-wheel-assembly" behind={<RigidForkArt f={fork} far fill={paint} />} front={<RimTrack w={front} />} />
      <RearDrivetrainArt d={drive} />
      <SeatpostArt s={seat} />
      <FrameMember tubes={tubes} fill={paint} feature="road-frame" />
      <TubeHighlight a={tubes[4].a} b={tubes[4].b} offset={tubes[4].ra * 0.45} />
      <TubeHighlight a={tubes[3].b} b={tubes[3].a} offset={tubes[3].rb * 0.45} />
      <RimBrakeArt w={rear} mount={t.p(bridgeMm)} />
      <ChainringArt d={drive} />
      <ChainArt d={drive} />
      <FrontDerailleur />
      <DerailleurArt d={drive} />
      <NearCrankArt d={drive} />
      <RigidForkArt f={fork} fill={paint} />
      <RimBrakeArt w={front} mount={fork.crown} />
      <SaddleArt s={seat} />
      <StemArt s={stem} />
      <DropBarArt b={bar} clamp={stem.clamp} />
    </g>
  );
}

export const roadProfile: BikeProfile = {
  type: "road",
  geometryProfile: "endurance-road",
  subtype: "Endurance road bike with drop handlebar, 28 mm slick tires, rigid fork, 2× drivetrain and rim caliper brakes",
  summary: "Long, low frame with a slim rigid fork, drop handlebar with brake/shift hoods, double chainring and dual-pivot rim brakes whose pads meet the rim.",
  features: ["drop-bar", "brake-shift-hood", "slick-tread", "rigid-fork", "rim-caliper", "brake-pad", "double-chainring", "front-derailleur", "clipless-pedal", "saddle-road"],
  metrics: {
    wheelbaseMm: f.wheelbase,
    headAngle: GEOMETRY.headAngle,
    seatAngle: GEOMETRY.seatAngle,
    stackMm: GEOMETRY.stack,
    reachMm: GEOMETRY.reach,
    chainstayMm: GEOMETRY.chainstay,
    bbHeightMm: R - GEOMETRY.bbDrop,
    tireWidthMm: TIRE.width,
    wheelRadiusMm: R,
  },
  landmarks: { bb: t.p(f.bb), rearAxle: rear.c, frontAxle: front.c, groundY: t.p(P(0, f.groundY)).y },
  wheels: { front, rear },
  drivetrain: drive,
  fork,
  seat,
  joints: { forkCrown: fork.crown, rearBrakeBridge: t.p(bridgeMm) },
  frameTubes: tubes,
  frameNodes: [t.p(f.bb), rear.c],
  parts: orderParts([
    rear.wheelPart,
    front.wheelPart,
    rear.brakePart,
    front.brakePart,
    { id: "frame", hit: tubeHits(tubes), anchor: lerp(tubes[4].a, tubes[4].b, 0.5) },
    fork.part,
    stem.part,
    bar.barPart,
    bar.shifterPart,
    seat.seatpostPart,
    seat.saddlePart,
    ...drive.parts,
  ]),
  Art: RoadArt,
};
