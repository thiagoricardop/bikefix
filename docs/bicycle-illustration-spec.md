# BikeFix Bicycle Illustration Specification

## Concept cue sheet

See [`illustration-review/bicycle-illustration-target-board.svg`](illustration-review/bicycle-illustration-target-board.svg). It is an intentionally schematic discussion board showing the category cues the five drawings must communicate; it is not a finished bicycle illustration, geometry reference, or asset to reuse. Use manufacturer/product/technical references and original geometry for the actual drawings.

## Product goal

The bicycle artwork is a navigational instrument, not decoration. A beginner should be able to locate a physical part on the drawing, select it, and see the matching part name and context. The artwork must be anatomically credible enough to support that recognition while remaining an original, accessible, scalable vector illustration.

## Required render system

- Five separately designed SVG profiles: road, mountain, hybrid/commuter, gravel, and one representative e-bike configuration.
- A common component-interaction primitive and a shared visual token system.
- Canonical `componentId` / `regionId` mappings from `src/data/bicycle-types/catalog.ts` remain the source of truth.
- Geometry modules may share low-level primitives, but they must not share all major tube endpoints and merely toggle a few styles.
- A comparison page/fixture renders all five side-by-side at the same viewBox aspect ratio and scale.

## Geometry landmarks

Each bike drawing should define or derive named landmarks before drawing paths:

- `rearAxle`
- `frontAxle`
- `bottomBracket`
- `seatCluster`
- `headTubeTop`
- `headTubeBottom`
- `seatpostTop`
- `saddleFront` / `saddleRear`
- `handlebarCenter`
- `rearBrakeMount` / `frontBrakeMount`
- cassette, chainring, derailleur pulley and chain contact points
- suspension pivots and shock mounts where applicable

These landmarks must be mutually coherent. Frame tubing, suspension components, fork, wheels, brakes and drivetrain should be derived from them rather than positioned as isolated decorations. Shared code may use a typed geometry interface, but type-specific geometry must be allowed to differ.

## Type silhouette matrix

| Type | Tires and wheels | Cockpit | Frame / fork | Required mechanical cues |
|---|---|---|---|---|
| Road | Narrow, smooth road tires; modest clearance | Drop bar with recognizable hoods and drops | Lightweight road/endurance geometry; rigid fork | Plausible road drivetrain; brake system aligned to rim or rotor |
| Mountain | Wide knobby tires, typically 29er look | Wide flat bar | Robust trail frame; suspension fork; full-suspension frame/linkage for this example | Real pivot relationship, integrated rear shock, disc rotors/calipers, wide-range cassette, derailleur, chain |
| Hybrid/commuter | Medium smooth/light-tread tires | Flat bar; upright reach/stack | Practical frame proportions; rigid fork by default | Optional rack/fenders/lights if not visually cluttered |
| Gravel | Mid-width tires with generous clearance | Flared drop bar | Relaxed/endurance geometry; rigid fork | Disc brakes; plausible 1x or 2x gearing; clearance around tire and fork |
| E-bike | Medium tire profile chosen for subtype | Flat bar and visible control/display if suitable | Declared subtype; robust frame sized around battery/motor | Battery mounted/integrated plausibly; mid-drive at bottom bracket for the selected example; drivetrain remains coherent |

## Rendering requirements

- Side-on product illustration with both tires on the same ground plane.
- Tire sidewall, rim, hub, spokes and axle are distinct and concentric.
- Frame tube joins are explicit; no disconnected floating parts.
- A suspension fork visibly has a crown, stanchions and lowers. A rigid fork is drawn as two believable blades within side-view conventions.
- A disc rotor is concentric to the axle and a caliper visibly intersects its edge. Rim brakes contact the rim. Do not mix visual cues from the two brake systems without explicitly describing a hybrid assembly.
- The chain path wraps the chainring and rear sprocket/cassette and passes through the derailleur pulley area. The rear cassette is near the hub, not visually substituted by concentric hub rings.
- All parts remain identifiable at the actual UI display size; detail must support rather than overwhelm selection.
- Highlighting is an overlay only. It must not hide the shape of the part or change what component the region represents.
- Hit-target geometry can be enlarged invisibly, but it should remain close to the corresponding visible part and be tested for overlap.
- Use unique SVG definitions per rendered instance and avoid hard-coded IDs that collide when two drawings mount on the same page.

## Accessibility and behavior

- Interactive part groups use keyboard focus, Enter/Space activation, meaningful labels, and selected state.
- Decorative paths do not create extra tab stops.
- The parts list offers all interactive regions by text and stays synchronized with the SVG selected state.
- Selecting a different bicycle type only preserves a component if that component exists on the new type; otherwise it resets predictably.
- Type/subtype variability is described honestly. The drawing never proves which exact parts a user's real bike has installed.

## Visual review checklist

For each type, inspect all of the following at desktop and mobile scale:

- Is the category obvious from silhouette alone, without reading the label?
- Are the wheel diameters, wheelbase, frame shape, seat/cockpit position, fork, and component contact points plausible together?
- Are the category-specific cues meaningful, rather than only color and tire width?
- Are shock, fork, brakes, rotor, cassette, chain, derailleur, crankset, battery and motor visibly attached in believable locations?
- Can a person identify each selected part while its highlight is active?
- Does every clickable shape map to the correct canonical component and accessible name?
- Does the selected state work with pointer, keyboard, touch-sized controls, and text search?
- Do screenshots of all five variants look like five different bicycles at equal scale?

## Definition of done

Do not consider the work complete because an SVG compiles or the selection tests pass. It is complete only when the geometry is independently defined per type, automated behavior checks pass, the five-bike comparison has been visually inspected, major mechanical assemblies look integrated, and any remaining inaccuracies are recorded as limitations.
