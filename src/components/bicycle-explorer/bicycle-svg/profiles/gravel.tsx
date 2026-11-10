/**
 * Gravel bicycle — representative flared-drop gravel geometry: taller and
 * shorter cockpit than the road example, 700×45C tread, generous clearance,
 * dropped seatstays, rigid fork with mounts, 1× drivetrain, flat-mount discs.
 */
import {
  BEAD_RADIUS_MM, buildDrivetrain, buildDropBar, buildRigidFork, buildSeat, buildStem, buildWheel, tubeHits, tubeMm,
  type ArtIds, type BikeProfile,
} from "../assemblies";
import {
  Boss, ChainArt, ChainringArt, DerailleurArt, DiscBrakeArt, DropBarArt, FarCrankArt, HiddenCaliperOutline, NearCrankArt, RearDrivetrainArt,
  RigidForkArt, SaddleArt, SeatpostArt, StemArt, WheelArt,
} from "../assembly-art";
import { P, add, angleOf, lerp, makeTransform, mul, norm, orderParts, perp, polar, solveFrame, sub } from "../geometry";
import { FrameMember, TubeHighlight } from "../primitives";

const TIRE = { width: 45, height: 43 };
const R = BEAD_RADIUS_MM + TIRE.height;
const GEOMETRY = { stack: 592, reach: 378, headAngle: 71, seatAngle: 73.5, chainstay: 430, bbDrop: 75 };

const f = solveFrame({
  ...GEOMETRY,
  headTube: 150,
  forkOffset: 50,
  wheelRadius: R,
  seatTube: 500,
  topTubeJoin: 470,
  seatStayJoin: 395,
  saddleHeight: 715,
  topTubeBelowHeadTop: 18,
  downTubeAboveHeadBottom: 28,
  spacers: 30,
  stemLength: 90,
  stemAngle: -4,
});
const t = makeTransform(f.groundY, f.rearAxle.x - R, f.frontAxle.x + R);

const drive = buildDrivetrain(t, {
  rearAxleMm: f.rearAxle,
  rings: [40],
  cogs: [11, 13, 15, 17, 19, 21, 24, 28, 32, 36, 42],
  engagedCog: 21,
  guideTeeth: 12,
  tensionTeeth: 12,
  cageMm: 80,
  cageAngle: 20,
  crankMm: 172.5,
  crankAngle: -45,
  pedal: "clipless",
});

const forkCrownMm = add(f.headBottom, mul(f.steeringDown, 28));
const bladeDown = norm(sub(f.frontAxle, forkCrownMm));
const bladeBack = mul(perp(bladeDown), -1);
const chainstayAngle = angleOf(sub(P(0, 0), f.rearAxle));

const front = buildWheel(t, "front", {
  axleMm: f.frontAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "gravel",
  spokes: 24,
  brake: { kind: "disc", rotorMm: 160, caliper: "flat-mount", angle: 140, mountMm: add(f.frontAxle, add(mul(bladeDown, -62), mul(bladeBack, 12))) },
  anchorAngle: -35,
});
const rear = buildWheel(t, "rear", {
  axleMm: f.rearAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "gravel",
  spokes: 24,
  brake: { kind: "disc", rotorMm: 160, caliper: "flat-mount", angle: 14, mountMm: polar(f.rearAxle, 72, chainstayAngle) },
  anchorAngle: 215,
  coverRadiusMm: drive.coverRadiusMm,
});

const fork = buildRigidFork(t, f, { crownMm: 28, topDia: 38, tipDia: 17, bosses: true });
const stem = buildStem(t, f, 30);
const bar = buildDropBar(t, f.barClamp, { reach: 70, drop: 112, flare: true, hoodRise: 6 });
const seat = buildSeat(t, f, 715, "road");

const downTube = { a: P(10, 8), b: f.downTubeFront };
const tubes = [
  tubeMm(t, "chainstay", f.rearAxle, P(-4, 4), 18, 26),
  tubeMm(t, "dropped-seatstay", f.rearAxle, f.seatStayTop, 13, 16),
  tubeMm(t, "seat-tube", P(0, 0), add(f.seatCluster, mul(f.seatUp, 14)), 35, 32),
  tubeMm(t, "down-tube", downTube.a, downTube.b, 56, 50),
  tubeMm(t, "top-tube", f.topTubeRear, f.topTubeFront, 32, 36),
  tubeMm(t, "head-tube", add(f.headTop, mul(f.steeringUp, 6)), add(f.headBottom, mul(f.steeringDown, 4)), 48, 58),
  tubeMm(t, "bb-shell", P(0, -0.5), P(0, 0.5), 48),
  tubeMm(t, "dropout", sub(f.rearAxle, P(0, 0.5)), add(f.rearAxle, P(0, 0.5)), 26),
];

const dtDir = norm(sub(downTube.b, downTube.a));
const dtUnder = mul(perp(dtDir), -1);
/** Third bottle mount under the down tube and top-tube bag bolts: decorative, part of the frame. */
const frameBosses = [
  ...[150, 214].map((s) => t.p(add(add(downTube.a, mul(dtDir, s)), mul(dtUnder, 25)))),
  ...[0.72, 0.84].map((k) => t.p(add(lerp(f.topTubeRear, f.topTubeFront, k), P(0, 15)))),
];

function GravelArt({ ids }: { ids: ArtIds }) {
  const paint = `url(#${ids.frame})`;
  return (
    <g data-feature="gravel-geometry">
      <FarCrankArt d={drive} />
      <WheelArt w={rear} feature="rear-wheel-assembly" behind={<DiscBrakeArt w={rear} />} />
      <WheelArt
        w={front}
        feature="front-wheel-assembly"
        behind={
          <>
            <RigidForkArt f={fork} far fill={paint} />
            <DiscBrakeArt w={front} />
          </>
        }
      />
      <RearDrivetrainArt d={drive} />
      <SeatpostArt s={seat} />
      <FrameMember tubes={tubes} fill={paint} feature="gravel-frame" />
      <HiddenCaliperOutline w={rear} />
      <TubeHighlight a={tubes[4].a} b={tubes[4].b} offset={tubes[4].ra * 0.45} />
      <TubeHighlight a={tubes[3].b} b={tubes[3].a} offset={tubes[3].rb * 0.45} />
      {frameBosses.map((p, i) => <Boss key={i} c={p} />)}
      <ChainringArt d={drive} />
      <ChainArt d={drive} />
      <DerailleurArt d={drive} />
      <NearCrankArt d={drive} />
      <RigidForkArt f={fork} fill={paint} />
      <SaddleArt s={seat} />
      <StemArt s={stem} />
      <DropBarArt b={bar} clamp={stem.clamp} />
    </g>
  );
}

export const gravelProfile: BikeProfile = {
  type: "gravel",
  geometryProfile: "flared-drop-gravel",
  subtype: "Gravel bike with flared drop handlebar, 45 mm tread tires, rigid fork with mounts, 1× drivetrain and flat-mount disc brakes",
  summary: "Taller, shorter cockpit than the road example, wide gravel tires with visible clearance, dropped seatstays, flared drops, single chainring and disc brakes.",
  features: ["flared-drop-bar", "flared-far-drop", "brake-shift-hood", "gravel-tread", "rigid-fork", "fork-mount-boss", "flat-mount-caliper", "disc-rotor", "single-chainring", "frame-boss"],
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
  joints: { forkCrown: fork.crown },
  frameTubes: tubes,
  frameNodes: [t.p(f.bb), rear.c],
  parts: orderParts([
    rear.wheelPart,
    front.wheelPart,
    rear.brakePart,
    front.brakePart,
    { id: "frame", hit: tubeHits(tubes), anchor: lerp(tubes[4].a, tubes[4].b, 0.45) },
    fork.part,
    stem.part,
    bar.barPart,
    bar.shifterPart,
    seat.seatpostPart,
    seat.saddlePart,
    ...drive.parts,
  ]),
  Art: GravelArt,
};
