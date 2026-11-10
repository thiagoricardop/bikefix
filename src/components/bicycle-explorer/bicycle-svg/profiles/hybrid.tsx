/**
 * Hybrid / commuter bicycle — representative upright fitness-hybrid geometry:
 * 700×38C smooth commuter tires, rigid fork, flat bar, 1× drivetrain with a
 * chainring guard and flat-mount disc brakes. Full fenders and a rear rack are
 * shown as common, optional commuter fittings.
 */
import {
  BEAD_RADIUS_MM, buildDrivetrain, buildFlatBar, buildRack, buildRigidFork, buildSeat, buildStem, buildWheel, tubeHits, tubeMm,
  type ArtIds, type BikeProfile,
} from "../assemblies";
import {
  ChainArt, ChainringArt, DerailleurArt, DiscBrakeArt, FarCrankArt, FenderArt, FlatBarArt, HiddenCaliperOutline, NearCrankArt, RackArt, RearDrivetrainArt,
  RigidForkArt, SaddleArt, SeatpostArt, StemArt, WheelArt,
} from "../assembly-art";
import { P, add, angleOf, lerp, makeTransform, mul, norm, orderParts, perp, polar, solveFrame, sub } from "../geometry";
import { FrameMember, Light, TubeHighlight } from "../primitives";

const TIRE = { width: 38, height: 36 };
const R = BEAD_RADIUS_MM + TIRE.height;
const GEOMETRY = { stack: 565, reach: 392, headAngle: 71.5, seatAngle: 73.5, chainstay: 450, bbDrop: 65 };

const f = solveFrame({
  ...GEOMETRY,
  headTube: 135,
  forkOffset: 50,
  wheelRadius: R,
  seatTube: 470,
  topTubeJoin: 445,
  seatStayJoin: 420,
  saddleHeight: 700,
  topTubeBelowHeadTop: 16,
  downTubeAboveHeadBottom: 30,
  spacers: 35,
  stemLength: 90,
  stemAngle: 10,
});
const t = makeTransform(f.groundY, f.rearAxle.x - R, f.frontAxle.x + R);

const drive = buildDrivetrain(t, {
  rearAxleMm: f.rearAxle,
  rings: [40],
  cogs: [11, 13, 15, 18, 21, 24, 28, 32, 37, 42],
  engagedCog: 21,
  guideTeeth: 11,
  tensionTeeth: 11,
  cageMm: 78,
  cageAngle: 20,
  crankMm: 170,
  crankAngle: -50,
  pedal: "flat",
});

const forkCrownMm = add(f.headBottom, mul(f.steeringDown, 24));
const bladeDown = norm(sub(f.frontAxle, forkCrownMm));
const bladeBack = mul(perp(bladeDown), -1);
const chainstayAngle = angleOf(sub(P(0, 0), f.rearAxle));

const front = buildWheel(t, "front", {
  axleMm: f.frontAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 22,
  tread: "commuter",
  spokes: 28,
  brake: { kind: "disc", rotorMm: 160, caliper: "flat-mount", angle: 140, mountMm: add(f.frontAxle, add(mul(bladeDown, -62), mul(bladeBack, 12))) },
  anchorAngle: -35,
});
const rear = buildWheel(t, "rear", {
  axleMm: f.rearAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 22,
  tread: "commuter",
  spokes: 28,
  brake: { kind: "disc", rotorMm: 160, caliper: "flat-mount", angle: 14, mountMm: polar(f.rearAxle, 72, chainstayAngle) },
  anchorAngle: 225,
  coverRadiusMm: drive.coverRadiusMm,
});

const fork = buildRigidFork(t, f, { crownMm: 24, topDia: 38, tipDia: 18 });
const stem = buildStem(t, f, 35);
const bar = buildFlatBar(t, f.barClamp, { rise: 30, sweep: 70, lever: 90 });
const seat = buildSeat(t, f, 700, "comfort");
const rack = buildRack(t, f, R, { clearanceMm: 44, rearMm: 178, frontMm: 150 });

const tubes = [
  tubeMm(t, "chainstay", f.rearAxle, P(-4, 4), 18, 26),
  tubeMm(t, "seatstay", f.rearAxle, f.seatStayTop, 15, 18),
  tubeMm(t, "seat-tube", P(0, 0), add(f.seatCluster, mul(f.seatUp, 14)), 36, 33),
  tubeMm(t, "down-tube", P(10, 8), f.downTubeFront, 52, 46),
  tubeMm(t, "top-tube", f.topTubeRear, f.topTubeFront, 34, 36),
  tubeMm(t, "head-tube", add(f.headTop, mul(f.steeringUp, 6)), add(f.headBottom, mul(f.steeringDown, 4)), 46, 50),
  tubeMm(t, "bb-shell", P(0, -0.5), P(0, 0.5), 48),
  tubeMm(t, "dropout", sub(f.rearAxle, P(0, 0.5)), add(f.rearAxle, P(0, 0.5)), 26),
];

function HybridArt({ ids }: { ids: ArtIds }) {
  const paint = `url(#${ids.frame})`;
  return (
    <g data-feature="hybrid-geometry">
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
      <FenderArt w={rear} from={208} to={14} stays={[172]} />
      <FenderArt w={front} from={222} to={4} stays={[22]} gapMm={14} />
      <RearDrivetrainArt d={drive} />
      <SeatpostArt s={seat} />
      <FrameMember tubes={tubes} fill={paint} feature="hybrid-frame" />
      <HiddenCaliperOutline w={rear} />
      <TubeHighlight a={tubes[4].a} b={tubes[4].b} offset={tubes[4].ra * 0.45} />
      <TubeHighlight a={tubes[3].b} b={tubes[3].a} offset={tubes[3].rb * 0.45} />
      <RackArt r={rack} />
      <Light c={rack.lightAt} w={8} h={13} front={false} />
      <ChainringArt d={drive} guard />
      <ChainArt d={drive} />
      <DerailleurArt d={drive} />
      <NearCrankArt d={drive} />
      <RigidForkArt f={fork} fill={paint} />
      <SaddleArt s={seat} />
      <StemArt s={stem} />
      <FlatBarArt b={bar} clamp={stem.clamp} />
    </g>
  );
}

export const hybridProfile: BikeProfile = {
  type: "hybrid",
  geometryProfile: "upright-commuter",
  subtype: "Hybrid/commuter bike with flat handlebar, 38 mm commuter tires, rigid fork, 1× drivetrain, flat-mount disc brakes, and optional fenders and rear rack",
  summary: "Upright frame with a short, tall cockpit, flat bar, smooth medium-width tires, chainring guard, full fenders and a rear rack (optional fittings vary by model).",
  features: ["flat-bar", "flat-bar-brake-lever", "trigger-shifter", "grip", "commuter-tread", "rigid-fork", "fender", "rear-rack", "rear-light", "chainring-guard", "flat-mount-caliper", "disc-rotor", "single-chainring", "saddle-comfort", "flat-pedal"],
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
  joints: { forkCrown: fork.crown, rackPlatformRear: rack.platform[0], rackPlatformFront: rack.platform[1] },
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
  Art: HybridArt,
};
