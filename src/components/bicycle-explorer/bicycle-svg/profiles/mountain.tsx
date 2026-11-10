/**
 * Mountain bicycle — representative modern full-suspension 29er trail bike.
 * The rear suspension is a generic Horst-link four-bar (main pivot above the
 * bottom bracket, chainstay pivot ahead of the rear axle, seatstay driving a
 * rocker on the seat tube, shock from the rocker to a down-tube mount). It is
 * not modelled on a specific manufacturer's kinematics.
 */
import {
  BEAD_RADIUS_MM, buildDrivetrain, buildFlatBar, buildSeat, buildStem, buildSuspensionFork, buildWheel, tubeHits, tubeMm,
  type ArtIds, type BikeProfile,
} from "../assemblies";
import {
  ChainArt, ChainringArt, DerailleurArt, DiscBrakeArt, DropperPostArt, FarCrankArt, FlatBarArt, HiddenCaliperOutline, NearCrankArt, RearDrivetrainArt,
  SaddleArt, StemArt, SuspensionForkArt, WheelArt,
} from "../assembly-art";
import {
  DRAW_SCALE, P, add, angleOf, lerp, makeTransform, mul, norm, orderParts, paddedHull, perp, polar, polygonHit, polygonPath, solveFrame,
  sub, tubePolygon, type PartRegion,
} from "../geometry";
import { Bolt, FrameMember, INK, RearShock, TubeHighlight } from "../primitives";

const TIRE = { width: 61, height: 60 };
const R = BEAD_RADIUS_MM + TIRE.height;
const GEOMETRY = { stack: 624, reach: 460, headAngle: 64.5, seatAngle: 76, chainstay: 437, bbDrop: 35 };

const f = solveFrame({
  ...GEOMETRY,
  headTube: 110,
  forkOffset: 44,
  wheelRadius: R,
  seatTube: 420,
  topTubeJoin: 390,
  seatStayJoin: 300,
  saddleHeight: 715,
  topTubeBelowHeadTop: 18,
  downTubeAboveHeadBottom: 40,
  spacers: 15,
  stemLength: 45,
  stemAngle: 0,
});
const t = makeTransform(f.groundY, f.rearAxle.x - R, f.frontAxle.x + R);

const drive = buildDrivetrain(t, {
  rearAxleMm: f.rearAxle,
  rings: [32],
  cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52],
  engagedCog: 21,
  guideTeeth: 12,
  tensionTeeth: 14,
  cageMm: 98,
  cageAngle: 18,
  crankMm: 170,
  crankAngle: -35,
  pedal: "flat",
});

/* Rear suspension: generic Horst-link four-bar (mm, BB at origin). */
const mainPivot = P(-40, 85);
const horstPivot = add(f.rearAxle, P(60, -14));
const rockerPivot = mul(f.seatUp, 300);
const rockerRear = add(rockerPivot, P(-65, 22));
const rockerFront = add(rockerPivot, P(48, 22));
const downTube = { a: P(15, 25), b: f.downTubeFront };
const dtDir = norm(sub(downTube.b, downTube.a));
const shockMountBase = add(downTube.a, mul(dtDir, 100));
const shockMount = add(shockMountBase, mul(perp(dtDir), 32));
const seatstayAngle = angleOf(sub(rockerRear, f.rearAxle));

const front = buildWheel(t, "front", {
  axleMm: f.frontAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "knobby",
  spokes: 28,
  brake: {
    kind: "disc",
    rotorMm: 200,
    caliper: "four-piston",
    angle: 150,
    mountMm: add(f.frontAxle, add(mul(f.steeringUp, 70), mul(perp(f.steeringDown), -23))),
  },
  anchorAngle: -35,
});
const rear = buildWheel(t, "rear", {
  axleMm: f.rearAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "knobby",
  spokes: 28,
  brake: { kind: "disc", rotorMm: 200, caliper: "four-piston", angle: 22, mountMm: polar(f.rearAxle, 126, seatstayAngle) },
  anchorAngle: 215,
  coverRadiusMm: drive.coverRadiusMm,
});

const fork = buildSuspensionFork(t, f, { stanchionDia: 36, lowerDia: 46, wheelRadiusMm: R, sealClearanceMm: 16, crownDepth: 40 });
const stem = buildStem(t, f, 15);
const bar = buildFlatBar(t, f.barClamp, { rise: 25, sweep: 40, lever: 85 });
const seat = buildSeat(t, f, 715, "trail");

const mainTubes = [
  tubeMm(t, "seat-tube", P(0, 0), add(f.seatCluster, mul(f.seatUp, 14)), 40, 36),
  tubeMm(t, "down-tube", downTube.a, downTube.b, 64, 54),
  tubeMm(t, "top-tube", f.topTubeRear, f.topTubeFront, 40, 46),
  tubeMm(t, "head-tube", add(f.headTop, mul(f.steeringUp, 8)), add(f.headBottom, mul(f.steeringDown, 6)), 54, 64),
  tubeMm(t, "bb-shell", P(0, -0.5), P(0, 0.5), 56),
  tubeMm(t, "main-pivot-lug", P(-6, 10), mainPivot, 52, 40),
  tubeMm(t, "shock-mount", shockMountBase, shockMount, 28, 22),
];
const chainstayTubes = [tubeMm(t, "chainstay", mainPivot, horstPivot, 34, 24)];
const seatstayTubes = [
  tubeMm(t, "seatstay-dropout", horstPivot, f.rearAxle, 24, 28),
  tubeMm(t, "seatstay", f.rearAxle, rockerRear, 22, 24),
];
const allTubes = [...mainTubes, ...chainstayTubes, ...seatstayTubes];

const pivots = { main: t.p(mainPivot), horst: t.p(horstPivot), rocker: t.p(rockerPivot), rockerRear: t.p(rockerRear), rockerFront: t.p(rockerFront) };
const shockTop = pivots.rockerFront;
const shockBottom = t.p(shockMount);
const rockerPad = t.l(13);
const rockerOutline = paddedHull([pivots.rocker, pivots.rockerRear, pivots.rockerFront], rockerPad);
const shockRadius = t.l(22);

const suspensionPart: PartRegion = {
  id: "rear-suspension",
  hit: [polygonHit(paddedHull([pivots.rocker, pivots.rockerRear, pivots.rockerFront], rockerPad + 3)), polygonHit(tubePolygon(shockTop, shockRadius + 3, shockBottom, shockRadius + 3))],
  anchor: lerp(shockBottom, shockTop, 0.6),
};

function MountainArt({ ids }: { ids: ArtIds }) {
  const paint = `url(#${ids.frame})`;
  const shade = `url(#${ids.frameShade})`;
  return (
    <g data-feature="mountain-geometry">
      <FarCrankArt d={drive} />
      <WheelArt w={rear} feature="rear-wheel-assembly" behind={<DiscBrakeArt w={rear} />} />
      <WheelArt
        w={front}
        feature="front-wheel-assembly"
        behind={
          <>
            <SuspensionForkArt f={fork} far />
            <DiscBrakeArt w={front} />
          </>
        }
      />
      <RearDrivetrainArt d={drive} />
      <DropperPostArt s={seat} />
      <FrameMember tubes={mainTubes} fill={paint} feature="front-triangle" />
      <TubeHighlight a={mainTubes[2].a} b={mainTubes[2].b} offset={mainTubes[2].ra * 0.45} />
      <TubeHighlight a={mainTubes[1].b} b={mainTubes[1].a} offset={mainTubes[1].rb * 0.45} />
      <FrameMember tubes={chainstayTubes} fill={shade} feature="swingarm-chainstay" />
      <FrameMember tubes={seatstayTubes} fill={shade} feature="swingarm-seatstay" />
      <HiddenCaliperOutline w={rear} />
      <g data-feature="main-pivot">
        <circle cx={pivots.main.x} cy={pivots.main.y} r={6.2} fill={INK.component} stroke={INK.outline} strokeWidth={1} />
        <Bolt c={pivots.main} r={3.2} />
      </g>
      <g data-feature="horst-pivot">
        <circle cx={pivots.horst.x} cy={pivots.horst.y} r={5} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
        <Bolt c={pivots.horst} r={2.5} />
      </g>
      <RearShock a={shockTop} b={shockBottom} scale={DRAW_SCALE} />
      <g data-feature="rocker-link">
        <path d={polygonPath(rockerOutline)} fill={shade} stroke={INK.outline} strokeWidth={1.4} strokeLinejoin="round" />
        <path d={polygonPath(paddedHull([pivots.rocker, lerp(pivots.rocker, pivots.rockerFront, 0.55)], rockerPad * 0.35))} fill={INK.outline} opacity={0.35} />
        <Bolt c={pivots.rocker} r={3.4} />
        <Bolt c={pivots.rockerRear} r={2.6} />
        <Bolt c={pivots.rockerFront} r={2.6} />
      </g>
      <ChainringArt d={drive} />
      <ChainArt d={drive} />
      <DerailleurArt d={drive} />
      <NearCrankArt d={drive} />
      <SuspensionForkArt f={fork} />
      <SaddleArt s={seat} />
      <StemArt s={stem} />
      <FlatBarArt b={bar} clamp={stem.clamp} />
    </g>
  );
}

export const mountainProfile: BikeProfile = {
  type: "mountain",
  geometryProfile: "full-suspension-trail",
  subtype: "Full-suspension 29-inch trail bike with a generic Horst-link four-bar rear end, telescopic fork, 1× drivetrain, dropper post and four-piston disc brakes",
  summary: "Long, slack trail geometry, knobby tires, wide flat bar on a short stem, suspension fork with crown/stanchions/lowers, rocker-driven rear shock, wide-range cassette and large disc rotors.",
  features: [
    "knobby-tread", "suspension-fork", "fork-stanchion", "fork-crown", "fork-arch", "rear-shock", "rocker-link", "main-pivot", "horst-pivot",
    "four-piston-caliper", "disc-rotor", "single-chainring", "dropper-post", "flat-bar", "trigger-shifter", "flat-pedal", "saddle-trail",
  ],
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
  joints: {
    mainPivot: pivots.main,
    horstPivot: pivots.horst,
    rockerPivot: pivots.rocker,
    rockerRear: pivots.rockerRear,
    rockerFront: pivots.rockerFront,
    shockTop,
    shockBottom,
    shockMountBase: t.p(shockMountBase),
  },
  frameTubes: allTubes,
  frameNodes: [t.p(f.bb), rear.c, pivots.main, pivots.horst, pivots.rocker, pivots.rockerRear],
  parts: orderParts([
    rear.wheelPart,
    front.wheelPart,
    rear.brakePart,
    front.brakePart,
    { id: "frame", hit: tubeHits(allTubes), anchor: lerp(mainTubes[2].a, mainTubes[2].b, 0.45) },
    suspensionPart,
    fork.part,
    stem.part,
    bar.barPart,
    bar.shifterPart,
    seat.seatpostPart,
    seat.saddlePart,
    ...drive.parts,
  ]),
  Art: MountainArt,
};
