import { describe, expect, it } from "vitest";
import type { BikeProfile } from "../../src/components/bicycle-explorer/bicycle-svg/assemblies";
import {
  DRAW_SCALE,
  HIT_PRIORITY,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  dist,
  dot,
  hitTest,
  polygonHit,
  shapeContains,
  sub,
  type Pt,
} from "../../src/components/bicycle-explorer/bicycle-svg/geometry";
import type { TubeSpec } from "../../src/components/bicycle-explorer/bicycle-svg/primitives";
import { BIKE_PROFILES } from "../../src/components/bicycle-explorer/bicycle-svg/profiles";
import { ebikeBatteryOutline, ebikeMotorOutline } from "../../src/components/bicycle-explorer/bicycle-svg/profiles/ebike";
import { BICYCLE_TYPES } from "../../src/data/bicycle-types/catalog";
import type { BikeTypeId } from "../../src/types/bicycle";

const profiles = Object.values(BIKE_PROFILES);
const byType = BIKE_PROFILES as Record<BikeTypeId, BikeProfile>;
const mm = (px: number) => px / DRAW_SCALE;

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const k = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, { x: a.x + ab.x * k, y: a.y + ab.y * k });
}

function partAnchor(p: BikeProfile, id: string): Pt {
  const part = p.parts.find((q) => q.id === id);
  if (!part) throw new Error(`${p.type} has no ${id} part`);
  return part.anchor;
}

function handPosition(p: BikeProfile): Pt {
  return partAnchor(p, p.features.includes("drop-bar") || p.features.includes("flared-drop-bar") ? "shifters" : "handlebars");
}

describe.each(profiles.map((p) => [p.type, p] as const))("%s bicycle geometry", (_type, p) => {
  it("stands both tires on one ground plane with level axles", () => {
    const { front, rear } = p.wheels;
    expect(front.c.y).toBeCloseTo(rear.c.y, 6);
    expect(front.c.y + front.outerR).toBeCloseTo(p.landmarks.groundY, 1);
    expect(rear.c.y + rear.outerR).toBeCloseTo(p.landmarks.groundY, 1);
    expect(dist(front.c, rear.c)).toBeCloseTo(p.metrics.wheelbaseMm * DRAW_SCALE, 1);
  });

  it("fits every wheel, saddle and part anchor inside the viewBox", () => {
    const { front, rear } = p.wheels;
    expect(rear.c.x - rear.outerR).toBeGreaterThan(0);
    expect(front.c.x + front.outerR).toBeLessThan(VIEW_WIDTH);
    expect(Math.min(...p.seat.saddlePoints.map((q) => q.y))).toBeGreaterThan(0);
    for (const part of p.parts) {
      expect(part.anchor.x, part.id).toBeGreaterThan(0);
      expect(part.anchor.x, part.id).toBeLessThan(VIEW_WIDTH);
      expect(part.anchor.y, part.id).toBeGreaterThan(0);
      expect(part.anchor.y, part.id).toBeLessThan(VIEW_HEIGHT);
    }
  });

  it("maps exactly the catalog's SVG regions, in hit-priority paint order", () => {
    const mapping = BICYCLE_TYPES.find((type) => type.id === p.type)!.svgRegionMappings;
    expect(p.parts.map((q) => q.id).sort()).toEqual(mapping.map((m) => m.componentId).sort());
    const order = p.parts.map((q) => HIT_PRIORITY.indexOf(q.id as (typeof HIT_PRIORITY)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("resolves each part's visible anchor to that part in the hit layer", () => {
    for (const part of p.parts) {
      expect(hitTest(p.parts, part.anchor), `${p.type} ${part.id}`).toBe(part.id);
    }
  });

  it("connects every frame tube to another tube or to an axle, pivot or bottom bracket", () => {
    const anchorTubes = new Set(["head-tube", "bb-shell", "dropout"]);
    const nodes = [...p.frameNodes, ...Object.values(p.joints), p.seat.cluster];
    const motor = p.type === "ebike" ? polygonHit(ebikeMotorOutline) : undefined;
    const connected = (tube: TubeSpec, end: Pt, r: number) =>
      nodes.some((n) => dist(n, end) <= r + 1.5) ||
      p.frameTubes.some((other) => other !== tube && distToSegment(end, other.a, other.b) <= Math.max(other.ra, other.rb) + 1) ||
      (motor !== undefined && shapeContains(motor, end));
    for (const tube of p.frameTubes.filter((q) => !anchorTubes.has(q.name))) {
      expect(connected(tube, tube.a, tube.ra), `${p.type} ${tube.name} start`).toBe(true);
      expect(connected(tube, tube.b, tube.rb), `${p.type} ${tube.name} end`).toBe(true);
    }
  });

  it("attaches the fork to the front axle and the drivetrain to the bottom bracket and rear hub", () => {
    expect(dist(p.fork.axle, p.wheels.front.c)).toBeLessThan(0.01);
    expect(dist(p.drivetrain.bb, p.landmarks.bb)).toBeLessThan(0.01);
    expect(dist(p.drivetrain.cog, p.wheels.rear.c)).toBeLessThan(0.01);
  });

  it("routes the chain on tangents to the chainring, cog and both derailleur pulleys", () => {
    const { loop } = p.drivetrain;
    expect(loop.wheels.map((w) => w.name)).toEqual(["cog", "ring", "tension", "guide"]);
    loop.segments.forEach((segment, i) => {
      const from = loop.wheels[i];
      const to = loop.wheels[(i + 1) % loop.wheels.length];
      const direction = sub(segment.end, segment.start);
      expect(dist(segment.start, from.c)).toBeCloseTo(from.r, 6);
      expect(dist(segment.end, to.c)).toBeCloseTo(to.r, 6);
      expect(dot(direction, sub(segment.start, from.c)) / dist(segment.start, segment.end)).toBeCloseTo(0, 6);
      expect(dot(direction, sub(segment.end, to.c)) / dist(segment.start, segment.end)).toBeCloseTo(0, 6);
    });
    // Rear derailleur hangs below and slightly behind the axle; the tension pulley sits lowest.
    const { guide, tension, cog } = p.drivetrain;
    expect(guide.c.y).toBeGreaterThan(cog.y);
    expect(tension.c.y).toBeGreaterThan(guide.c.y);
    expect(Math.abs(guide.c.x - cog.x)).toBeLessThan(30 * DRAW_SCALE);
  });

  it("fits a plausible chain length for the drawn chainstay", () => {
    const pitches = p.drivetrain.loop.length / 12.7;
    expect(pitches).toBeGreaterThan(96);
    expect(pitches).toBeLessThan(130);
  });

  it("uses opposite crank arms of equal length from the bottom-bracket spindle", () => {
    const { bb, nearPedal, farPedal } = p.drivetrain;
    expect(nearPedal.x - bb.x).toBeCloseTo(bb.x - farPedal.x, 6);
    expect(nearPedal.y - bb.y).toBeCloseTo(bb.y - farPedal.y, 6);
    expect(mm(dist(bb, nearPedal))).toBeCloseTo(p.drivetrain.spec.crankMm, 6);
    expect(farPedal.y + 5).toBeLessThan(p.landmarks.groundY);
    expect(nearPedal.y + 5).toBeLessThan(p.landmarks.groundY);
  });

  it("puts each brake where it can act on its wheel", () => {
    for (const wheel of [p.wheels.front, p.wheels.rear]) {
      const brake = wheel.brake;
      if (brake.kind === "disc") {
        expect(dist(brake.caliper, wheel.c)).toBeCloseTo(brake.caliperRadius, 6);
        expect(brake.caliperRadius - brake.depth / 2).toBeLessThan(brake.rotorR);
        expect(brake.caliperRadius + brake.depth / 2).toBeGreaterThan(brake.rotorR);
        expect(brake.rotorR).toBeLessThan(wheel.beadR - wheel.rimDepth);
        expect(brake.rotorR).toBeGreaterThan(wheel.flangeR);
      } else {
        expect(dist(brake.pad, wheel.c)).toBeCloseTo(brake.rimTrackR, 6);
        expect(brake.rimTrackR).toBeLessThan(wheel.beadR);
        expect(brake.rimTrackR).toBeGreaterThan(wheel.beadR - wheel.rimDepth);
        expect(dist(brake.body, wheel.c)).toBeGreaterThan(wheel.outerR);
      }
    }
  });

  it("declares its defining features and a representative-subtype description", () => {
    expect(p.features.length).toBeGreaterThanOrEqual(8);
    expect(new Set(p.features).size).toBe(p.features.length);
    expect(p.subtype.length).toBeGreaterThan(10);
  });
});

describe("cross-type silhouette differences", () => {
  it("orders tire widths from road to mountain", () => {
    const w = (type: BikeTypeId) => byType[type].metrics.tireWidthMm;
    expect(w("road")).toBeLessThanOrEqual(32);
    expect(w("road")).toBeLessThan(w("hybrid"));
    expect(w("hybrid")).toBeLessThan(w("gravel"));
    expect(w("gravel")).toBeLessThan(w("ebike"));
    expect(w("ebike")).toBeLessThanOrEqual(w("mountain"));
    expect(w("mountain")).toBeGreaterThanOrEqual(55);
  });

  it("gives the trail bike the slackest head angle and longest wheelbase", () => {
    const mtb = byType.mountain.metrics;
    for (const p of profiles.filter((q) => q.type !== "mountain")) {
      expect(mtb.headAngle).toBeLessThan(p.metrics.headAngle - 3);
      expect(mtb.wheelbaseMm).toBeGreaterThan(p.metrics.wheelbaseMm + 40);
    }
    expect(mtb.bbHeightMm).toBeGreaterThan(byType.road.metrics.bbHeightMm);
  });

  it("puts the road rider lowest at the hands and the hybrid/e-bike rider upright", () => {
    const handDrop = (type: BikeTypeId) => {
      const p = byType[type];
      return mm(handPosition(p).y - Math.min(...p.seat.saddlePoints.map((q) => q.y)));
    };
    expect(handDrop("road")).toBeGreaterThan(handDrop("gravel"));
    expect(handDrop("gravel")).toBeGreaterThan(handDrop("hybrid"));
    expect(handDrop("hybrid")).toBeGreaterThan(handDrop("ebike"));
    expect(handDrop("road")).toBeGreaterThan(30);
    expect(handDrop("hybrid")).toBeLessThan(0);
  });

  it("keeps the gravel bike longer and slacker than the road bike with much wider tires", () => {
    const road = byType.road.metrics;
    const gravel = byType.gravel.metrics;
    expect(gravel.wheelbaseMm).toBeGreaterThan(road.wheelbaseMm);
    expect(gravel.headAngle).toBeLessThan(road.headAngle);
    expect(gravel.tireWidthMm - road.tireWidthMm).toBeGreaterThanOrEqual(12);
  });

  it("uses a distinct geometry profile name for every type", () => {
    expect(new Set(profiles.map((p) => p.geometryProfile)).size).toBe(profiles.length);
  });
});

describe("type-specific mechanics", () => {
  it("road: rim calipers act on the rim and the cockpit is a drop bar with hoods", () => {
    const road = byType.road;
    expect(road.wheels.front.brake.kind).toBe("rim");
    expect(road.wheels.rear.brake.kind).toBe("rim");
    expect(road.fork.kind).toBe("rigid");
    expect(road.features).toEqual(expect.arrayContaining(["drop-bar", "brake-shift-hood", "double-chainring", "slick-tread"]));
    expect(road.drivetrain.ringRadii).toHaveLength(2);
    expect(road.wheels.front.spec.radialLacing).toBe(true);
  });

  it("mountain: a four-bar rear suspension with a shock of trail-bike length between frame and rocker", () => {
    const mtb = byType.mountain;
    const { shockTop, shockBottom, rockerFront, rockerPivot, rockerRear, mainPivot, horstPivot } = mtb.joints;
    expect(dist(shockTop, rockerFront)).toBeLessThan(0.01);
    const shockMm = mm(dist(shockTop, shockBottom));
    expect(shockMm).toBeGreaterThan(185);
    expect(shockMm).toBeLessThan(235);
    // Horst pivot sits on the chainstay ahead of and below the rear axle.
    expect(horstPivot.x).toBeGreaterThan(mtb.wheels.rear.c.x);
    expect(horstPivot.y).toBeGreaterThan(mtb.wheels.rear.c.y - 1);
    // Main pivot is above and behind the BB; the rocker pivot sits on the seat tube above it.
    expect(mainPivot.x).toBeLessThan(mtb.landmarks.bb.x + 1);
    expect(mainPivot.y).toBeLessThan(mtb.landmarks.bb.y);
    expect(rockerPivot.y).toBeLessThan(mainPivot.y);
    expect(rockerRear.x).toBeLessThan(rockerPivot.x);
    expect(mtb.fork.kind).toBe("suspension");
    expect(mtb.features).toEqual(expect.arrayContaining(["rear-shock", "rocker-link", "main-pivot", "horst-pivot", "knobby-tread", "dropper-post"]));
    const suspension = mtb.parts.find((q) => q.id === "rear-suspension")!;
    expect(suspension.hit.some((shape) => shapeContains(shape, shockBottom) || shapeContains(shape, shockTop))).toBe(true);
  });

  it("suspension forks clear the tire with their seals and arch and keep exposed stanchion", () => {
    for (const p of [byType.mountain, byType.ebike]) {
      const fork = p.fork;
      expect(fork.kind).toBe("suspension");
      if (fork.kind !== "suspension") continue;
      expect(dist(fork.seal, fork.axle)).toBeGreaterThan(p.wheels.front.outerR);
      expect(fork.exposedMm).toBeGreaterThan(p.type === "mountain" ? 100 : 60);
      expect(fork.rLower).toBeGreaterThan(fork.rStanchion);
    }
  });

  it("hybrid and gravel use rigid forks with flat bar or flared drop cockpits", () => {
    expect(byType.hybrid.fork.kind).toBe("rigid");
    expect(byType.gravel.fork.kind).toBe("rigid");
    expect(byType.hybrid.features).toEqual(expect.arrayContaining(["flat-bar", "fender", "rear-rack", "commuter-tread"]));
    expect(byType.gravel.features).toEqual(expect.arrayContaining(["flared-drop-bar", "flared-far-drop", "gravel-tread", "single-chainring"]));
    expect(byType.gravel.drivetrain.ringRadii).toHaveLength(1);
  });

  it("fendered bikes leave room between the front fender and the down tube", () => {
    for (const p of profiles.filter((q) => q.features.includes("fender"))) {
      const downTube = p.frameTubes.find((tube) => tube.name === "down-tube")!;
      const gap = distToSegment(p.wheels.front.c, downTube.a, downTube.b) - Math.max(downTube.ra, downTube.rb) - p.wheels.front.outerR;
      expect(mm(gap), p.type).toBeGreaterThan(16 + 8);
    }
  });

  it("e-bike: mid-drive motor surrounds the bottom bracket and the battery lies along the down tube", () => {
    const ebike = byType.ebike;
    expect(shapeContains(polygonHit(ebikeMotorOutline), ebike.landmarks.bb)).toBe(true);
    const downTube = ebike.frameTubes.find((tube) => tube.name === "down-tube")!;
    for (const corner of ebikeBatteryOutline) {
      expect(distToSegment(corner, downTube.a, downTube.b)).toBeLessThan(Math.max(downTube.ra, downTube.rb) + 1);
    }
    const ringR = Math.max(...ebike.drivetrain.ringRadii);
    for (const corner of ebikeBatteryOutline) {
      expect(dist(corner, ebike.landmarks.bb)).toBeGreaterThan(ringR);
    }
    expect(ebike.features).toEqual(expect.arrayContaining(["battery-pack", "mid-drive-motor", "ebike-display", "rear-rack", "fender"]));
    expect(hitTest(ebike.parts, ebike.landmarks.bb)).not.toBe("battery");
  });

  it("only the mountain bike exposes rear suspension and only the e-bike exposes battery and motor", () => {
    for (const p of profiles) {
      const ids = p.parts.map((q) => q.id);
      expect(ids.includes("rear-suspension")).toBe(p.type === "mountain");
      expect(ids.includes("battery")).toBe(p.type === "ebike");
      expect(ids.includes("motor")).toBe(p.type === "ebike");
    }
  });
});
