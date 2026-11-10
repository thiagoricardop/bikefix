/**
 * E-bike — representative mid-drive trekking/commuter e-bike: battery
 * integrated along the down tube, drive unit housing around the bottom bracket,
 * short-travel suspension fork, 1× drivetrain, post-mount hydraulic discs and
 * commuter fittings (fenders, rack, lights, handlebar display). Electrical
 * layouts vary considerably between manufacturers.
 */
import {
  BEAD_RADIUS_MM, buildDrivetrain, buildFlatBar, buildRack, buildSeat, buildStem, buildSuspensionFork, buildWheel, tubeHits, tubeMm,
  type ArtIds, type BikeProfile,
} from "../assemblies";
import {
  ChainArt, ChainringArt, DerailleurArt, DiscBrakeArt, FarCrankArt, FenderArt, FlatBarArt, HiddenCaliperOutline, NearCrankArt, RackArt, RearDrivetrainArt,
  SaddleArt, SeatpostArt, StemArt, SuspensionForkArt, WheelArt,
} from "../assembly-art";
import {
  P, add, angleOf, lerp, makeTransform, mul, norm, orderParts, paddedHull, perp, polar, polygonHit, polygonPath, round, smoothPath,
  solveFrame, sub, type PartRegion,
} from "../geometry";
import { Bolt, FrameMember, INK, Light, TubeHighlight } from "../primitives";

const TIRE = { width: 55, height: 50 };
const R = BEAD_RADIUS_MM + TIRE.height;
const GEOMETRY = { stack: 630, reach: 420, headAngle: 69, seatAngle: 74, chainstay: 470, bbDrop: 60 };

const f = solveFrame({
  ...GEOMETRY,
  headTube: 165,
  forkOffset: 50,
  wheelRadius: R,
  seatTube: 480,
  topTubeJoin: 420,
  seatStayJoin: 400,
  saddleHeight: 700,
  topTubeBelowHeadTop: 30,
  downTubeAboveHeadBottom: 45,
  spacers: 20,
  stemLength: 80,
  stemAngle: 15,
});
const t = makeTransform(f.groundY, f.rearAxle.x - R, f.frontAxle.x + R);

const drive = buildDrivetrain(t, {
  rearAxleMm: f.rearAxle,
  rings: [38],
  cogs: [11, 13, 15, 17, 19, 21, 24, 28, 32, 37, 46],
  engagedCog: 21,
  guideTeeth: 12,
  tensionTeeth: 12,
  cageMm: 90,
  cageAngle: 20,
  crankMm: 170,
  crankAngle: -45,
  pedal: "flat",
});

const seatstayAngle = angleOf(sub(f.seatStayTop, f.rearAxle));

const front = buildWheel(t, "front", {
  axleMm: f.frontAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "trekking",
  spokes: 32,
  brake: {
    kind: "disc",
    rotorMm: 180,
    caliper: "post-mount",
    angle: 150,
    mountMm: add(f.frontAxle, add(mul(f.steeringUp, 70), mul(perp(f.steeringDown), -21))),
  },
  anchorAngle: -35,
});
const rear = buildWheel(t, "rear", {
  axleMm: f.rearAxle,
  tireWidthMm: TIRE.width,
  tireHeightMm: TIRE.height,
  rimDepthMm: 24,
  tread: "trekking",
  spokes: 32,
  brake: { kind: "disc", rotorMm: 180, caliper: "post-mount", angle: 22, mountMm: polar(f.rearAxle, 112, seatstayAngle) },
  anchorAngle: 225,
  coverRadiusMm: drive.coverRadiusMm,
});

const fork = buildSuspensionFork(t, f, { stanchionDia: 32, lowerDia: 42, wheelRadiusMm: R, sealClearanceMm: 22, crownDepth: 36 });
const stem = buildStem(t, f, 20);
const bar = buildFlatBar(t, f.barClamp, { rise: 25, sweep: 60, lever: 88 });
const seat = buildSeat(t, f, 700, "touring");
const rack = buildRack(t, f, R, { clearanceMm: 42, rearMm: 172, frontMm: 160 });

/* Down tube with integrated battery. */
const downTube = { a: P(55, 95), b: f.downTubeFront };
const dtDir = norm(sub(downTube.b, downTube.a));
const dtTop = perp(dtDir);
const dtAt = (s: number, offset: number) => add(add(downTube.a, mul(dtDir, s)), mul(dtTop, offset));
const BATTERY = { from: 70, to: 480, centreOffset: -7, halfWidth: 27, corner: 9 };
const batteryCorners = [
  dtAt(BATTERY.from + BATTERY.corner, BATTERY.centreOffset - BATTERY.halfWidth + BATTERY.corner),
  dtAt(BATTERY.to - BATTERY.corner, BATTERY.centreOffset - BATTERY.halfWidth + BATTERY.corner),
  dtAt(BATTERY.to - BATTERY.corner, BATTERY.centreOffset + BATTERY.halfWidth - BATTERY.corner),
  dtAt(BATTERY.from + BATTERY.corner, BATTERY.centreOffset + BATTERY.halfWidth - BATTERY.corner),
].map((p) => t.p(p));
const batteryOutline = paddedHull(batteryCorners, t.l(BATTERY.corner));
const batteryLock = t.p(dtAt(BATTERY.to - 34, BATTERY.centreOffset + 4));
const batteryMid = t.p(dtAt((BATTERY.from + BATTERY.to) / 2, BATTERY.centreOffset));

/* Mid-drive housing around the bottom bracket (mm, BB at origin). */
const motorOutlineMm = [P(-62, 40), P(-30, 82), P(40, 110), P(105, 100), P(132, 50), P(122, -20), P(75, -68), P(0, -80), P(-55, -55), P(-70, -5)];
const motorOutline = motorOutlineMm.map((p) => t.p(p));
const motorCover = [P(20, 88), P(96, 80), P(114, 40), P(104, -12)].map((p) => t.p(p));

const tubes = [
  tubeMm(t, "chainstay", f.rearAxle, P(-40, 22), 20, 28),
  tubeMm(t, "seatstay", f.rearAxle, f.seatStayTop, 16, 20),
  tubeMm(t, "seat-tube", P(-6, 20), add(f.seatCluster, mul(f.seatUp, 14)), 38, 34),
  tubeMm(t, "down-tube", downTube.a, downTube.b, 84, 70),
  tubeMm(t, "top-tube", f.topTubeRear, f.topTubeFront, 38, 44),
  tubeMm(t, "head-tube", add(f.headTop, mul(f.steeringUp, 6)), add(f.headBottom, mul(f.steeringDown, 4)), 52, 60),
  tubeMm(t, "dropout", sub(f.rearAxle, P(0, 0.5)), add(f.rearAxle, P(0, 0.5)), 28),
];

const batteryPart: PartRegion = { id: "battery", hit: [polygonHit(paddedHull(batteryCorners, t.l(BATTERY.corner) + 2))], anchor: batteryMid };
const motorPart: PartRegion = { id: "motor", hit: [polygonHit(paddedHull(motorOutline, 2))], anchor: t.p(P(110, 55)) };

const frontLight = add(fork.legTop, P(12, 8));
const display = { c: add(stem.clamp, P(-3, -9)), angle: -24 };

function EbikeArt({ ids }: { ids: ArtIds }) {
  const paint = `url(#${ids.frame})`;
  const cell = `url(#${ids.battery})`;
  return (
    <g data-feature="ebike-geometry">
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
      <FenderArt w={rear} from={208} to={16} stays={[172]} />
      <FenderArt w={front} from={222} to={2} stays={[22]} />
      <RearDrivetrainArt d={drive} />
      <SeatpostArt s={seat} />
      <FrameMember tubes={tubes} fill={paint} feature="ebike-frame" />
      <TubeHighlight a={tubes[4].a} b={tubes[4].b} offset={tubes[4].ra * 0.45} />
      <HiddenCaliperOutline w={rear} />
      <g data-feature="battery-pack">
        <path d={polygonPath(batteryOutline)} fill={cell} stroke={INK.outline} strokeWidth={1.2} strokeLinejoin="round" />
        <path d={`M ${round(batteryCorners[0].x)} ${round(batteryCorners[0].y)} L ${round(batteryCorners[1].x)} ${round(batteryCorners[1].y)}`} stroke="#ffffff" strokeOpacity={0.14} strokeWidth={1.2} />
        <g data-feature="battery-lock">
          <circle cx={round(batteryLock.x)} cy={round(batteryLock.y)} r={3.2} fill={INK.metal} stroke={INK.outline} strokeWidth={0.8} />
          <rect x={round(batteryLock.x - 0.6)} y={round(batteryLock.y - 2)} width={1.2} height={4} fill={INK.outline} />
        </g>
      </g>
      <RackArt r={rack} />
      <Light c={rack.lightAt} w={8} h={13} front={false} />
      <g data-feature="mid-drive-motor">
        <path d={smoothPath(motorOutline)} fill="#3a423d" stroke={INK.outline} strokeWidth={1.4} strokeLinejoin="round" />
        <path d={smoothPath(motorCover, false)} fill="none" stroke="#ffffff" strokeOpacity={0.16} strokeWidth={1.6} />
        {[P(-46, 18), P(108, 62), P(60, -52)].map((p, i) => <Bolt key={i} c={t.p(p)} r={1.7} />)}
      </g>
      <ChainringArt d={drive} guard />
      <ChainArt d={drive} />
      <DerailleurArt d={drive} />
      <NearCrankArt d={drive} />
      <SuspensionForkArt f={fork} />
      <Light c={frontLight} w={13} h={9} front />
      <SaddleArt s={seat} />
      <StemArt s={stem} />
      <FlatBarArt b={bar} clamp={stem.clamp} />
      <g data-feature="ebike-display" transform={`rotate(${display.angle} ${round(display.c.x)} ${round(display.c.y)})`}>
        <rect x={round(display.c.x - 9)} y={round(display.c.y - 3.6)} width={18} height={7.2} rx={1.8} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
        <rect x={round(display.c.x - 6.6)} y={round(display.c.y - 3.6)} width={13.2} height={1.6} rx={0.6} fill="#7ea0b5" />
      </g>
    </g>
  );
}

export const ebikeProfile: BikeProfile = {
  type: "ebike",
  geometryProfile: "mid-drive-trekking",
  subtype: "Mid-drive trekking/commuter e-bike with a down-tube battery, drive unit at the bottom bracket, suspension fork, fenders, rack, lights and handlebar display",
  summary: "Long, upright trekking frame with a deep down tube carrying the battery, a drive unit housing the bottom bracket, short-travel fork, wide trekking tires and commuter fittings.",
  features: [
    "battery-pack", "battery-lock", "mid-drive-motor", "suspension-fork", "fork-stanchion", "fork-crown", "trekking-tread", "fender", "rear-rack",
    "ebike-display", "front-light", "rear-light", "post-mount-caliper", "disc-rotor", "single-chainring", "chainring-guard", "flat-bar", "saddle-touring",
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
    batteryLower: lerp(batteryCorners[0], batteryCorners[3], 0.5),
    batteryUpper: lerp(batteryCorners[1], batteryCorners[2], 0.5),
    downTubeLower: t.p(downTube.a),
    downTubeUpper: t.p(downTube.b),
    rackPlatformRear: rack.platform[0],
    rackPlatformFront: rack.platform[1],
  },
  frameTubes: tubes,
  frameNodes: [t.p(f.bb), rear.c],
  parts: orderParts([
    rear.wheelPart,
    front.wheelPart,
    rear.brakePart,
    front.brakePart,
    { id: "frame", hit: tubeHits(tubes), anchor: lerp(tubes[4].a, tubes[4].b, 0.5) },
    batteryPart,
    motorPart,
    fork.part,
    stem.part,
    bar.barPart,
    bar.shifterPart,
    seat.seatpostPart,
    seat.saddlePart,
    ...drive.parts,
  ]),
  Art: EbikeArt,
};

/** Outline of the drive-unit housing in SVG space (used by geometry tests). */
export const ebikeMotorOutline = motorOutline;
/** Battery outline in SVG space (used by geometry tests). */
export const ebikeBatteryOutline = batteryOutline;
