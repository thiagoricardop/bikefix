# Bicycle Illustration Audit — Phase 03

**Status:** Historical findings superseded by the modular geometry rebuild. On 2026-10-29, the product owner confirmed that the rebuilt bicycle visuals are accepted and that Phase 03 had been completed but not logged. Automated test/build verification should still be rerun in a compatible environment. See also [`docs/bicycle-illustration-review-report.md`](bicycle-illustration-review-report.md) for the historical per-type findings.  
**Scope:** Road, mountain, hybrid/commuter, gravel, and e-bike drawings in `src/components/bicycle-explorer/interactive-bicycle-svg.tsx`, plus homepage/mini bicycle illustrations.  
**Purpose:** Record concrete findings so future implementations are judged against bicycle anatomy, not subjective styling alone.

The target concept board is available at [`illustration-review/bicycle-illustration-target-board.svg`](illustration-review/bicycle-illustration-target-board.svg). It communicates intended category cues only and must not be mistaken for production artwork.

## Overall conclusion at time of the original audit

At the time of this 2026-10-28 audit, the interactive explorer was useful as a proof of interaction, but the pre-rebuild artwork was not ready to serve as a confident visual part finder. That implementation shared principal frame points across the five types. These findings triggered the modular geometry rebuild. The product owner subsequently accepted the rebuilt visuals on 2026-10-29; do not read the historical defects below as a description of the current profiles.

The mountain illustration is the most obvious failure: it claims to represent a modern full-suspension trail bike, but the rear shock is drawn as a diagonal bar with no legible frame/linkage relationship. The suspension fork also reads as one straight fork line with highlights instead of a credible fork assembly. The drivetrain and brake details are stylized enough that several components appear detached or mechanically ambiguous at explorer scale.

This is an assessment of the source geometry and available Phase 03 preview. It is not a claim that a physical bicycle or manufacturer model has been identified.

## Cross-variant defects

| Area | Observed result | Why it fails | Required correction |
|---|---|---|---|
| Frame silhouette | Same key coordinates (seat cluster, head tube, bottom bracket, axles) are reused for every type | Frame geometry is one generic shape; category differences are superficial | Create a separate geometry definition for each type and validate its silhouette side-by-side |
| Wheel geometry | Repeated concentric circles and many spokes radiating from a single central point | Technically simplified to the point of looking like a wheel icon, not a product drawing; spoke-to-hub detail is absent | Preserve clear concentric tire/rim/hub hierarchy; use restrained but plausible spoke attachment and spoke count |
| Brakes | Small block-like shapes are placed near fork/frame, while rotor and caliper alignment is unclear at rendered size | Users cannot reliably identify the actual brake assembly | Explicitly choose a representative brake type for each drawing; align disc rotor to hub and caliper to rotor edge, or show rim pads at the rim |
| Drivetrain | Cassette is represented by concentric circles around the rear wheel center; chain is nearly straight between rear axle and crank | Cassette/chain/derailleur relationships are unclear or inaccurate | Place cassette at rear hub, chainring at bottom bracket, chain around teeth, derailleur cage/pulleys on a plausible hanger |
| Fork | One diagonal tube with decorative internal lines | No obvious crown, paired stanchions or two lower legs on a suspension fork | Draw a coherent rigid or suspension fork, chosen to match the category |
| Component differentiation | Most selectable areas are broad overlay paths independent of a realistic subassembly | Some hit regions identify a vague area rather than a mechanically recognizable part | Tie each region to its visible physical part; provide text alternatives for tiny/hidden parts |
| Aesthetic hierarchy | Strong gradients, oversized tubes, decorative frame badge, highlighted stripes and abundant spokes | Decorative treatment hides geometry issues and lends a toy/cartoon quality | Prioritize believable proportions, component attachment, clean silhouettes and restrained highlights |
| Architecture | A single large SVG JSX component uses conditionals for type differences | Detailed per-type changes are hard to reason about and regress | Share low-level primitives while defining distinct road, MTB, hybrid, gravel and e-bike geometry |

## Findings by bicycle type

### 1. Mountain bicycle — highest priority

- The current frame still reads as a generic diamond frame; it does not communicate the linkage architecture of a modern full-suspension trail bike.
- The rear-shock shape is a diagonal rod near the rear wheel, not a shock visibly mounted between a front-frame mount and rear linkage/swingarm mount. Its endpoints do not explain how rear suspension moves.
- There is no clearly legible rocker/linkage and coherent rear triangle. A full-suspension illustration must show meaningful pivot points rather than a lone decorative shock.
- The fork's two highlight paths follow one diagonal line and do not read as crown + left/right fork legs with stanchions and lowers.
- Tire width and tread hint at an MTB, but the drivetrain lacks a readable wide-range cassette/derailleur chain path and the disc brake calipers do not clearly meet the rotors.
- **Required target:** recognizable 29-inch modern trail full-suspension silhouette, wide knobby tires, flat wide handlebar, suspension fork, integrated rear shock/linkage, disc brakes, wide-range rear cassette and plausible chain routing.

### 2. Road bicycle

- It shares the mountain frame coordinate system and overall posture, making it hard to distinguish from other variants apart from thinner tires and drop bars.
- The drop-bar outline is a small loop rather than a recognizable road cockpit with hoods and drops; stem and bar relationship needs a clear drawing.
- Road-specific frame proportion, low cockpit, slim tire profile, rigid fork clearance, and road drivetrain are not sufficiently communicated.
- **Required target:** narrow smooth tires; lightweight road/endurance geometry; rigid fork; recognizable drop bar, hoods and drops; plausible road drivetrain and correctly positioned brake hardware.

### 3. Hybrid / commuter

- Uses the same core frame silhouette and tire treatment as the road bike, despite the intended more upright fit and everyday utility.
- No distinctive commuter equipment is shown, so this variant is primarily a name and handlebar toggle.
- **Required target:** more upright head/cockpit relation, flat bar, medium-width smooth or lightly treaded tires, rigid fork as the representative default, and optionally a restrained rack/fender/light setup.

### 4. Gravel bicycle

- Its geometry is essentially the road/mountain geometry with wider tires. A small loop used for drop bars does not show gravel-style flare.
- Tire clearance, more relaxed endurance posture, rigid fork, disc brake geometry, and gravel drivetrain are not legible enough to differentiate it.
- **Required target:** flared drop bars, medium-wide tires and frame/fork clearance, relaxed road-like geometry, rigid fork, disc brakes and plausible 1x or 2x gravel drivetrain.

### 5. E-bike

- It inherits the same frame and cockpit geometry as the non-electric variants; electrical equipment appears as add-on shapes instead of a cohesive frame/motor system.
- Battery and motor placement need to be tied to one declared subtype. A mid-drive motor belongs around the bottom bracket; an integrated battery should follow the downtube/frame envelope without intersecting the chain path or crank clearance.
- **Required target:** state a representative subtype (recommended: mid-drive trekking/commuter e-bike), then show a plausible battery, motor around bottom bracket, appropriate cockpit/control, and mechanical components still aligned as on a bicycle.

## Priority order

1. Rebuild MTB silhouette and suspension anatomy.
2. Separate all five type geometries; do not make the other four quick variations of the new MTB.
3. Correct component placement: wheel hubs, rotors/calipers, cassette, derailleur, chain, crankset, fork and cockpit.
4. Retain the interactive selection model, keyboard access, region IDs, text list and part panel.
5. Render a five-bike comparison at equal scale; visually review desktop/mobile; only then mark Phase 03 accepted.

## Review references

Use references to verify real geometry, not as assets to paste or trace:

- Scott Spark 970 full-suspension product reference: https://www.ebike-24.com/scott-spark-970-29-zoll-12k-fully-dark-stellar-blue-539192c — useful for rear triangle, shock integration, wide-range rear drivetrain and MTB tire profile.
- Bike category side-profile comparison (road, MTB, gravel and hybrid examples): https://www.cyclistshub.com/how-to-choose-a-bike/ — useful as a category-level silhouette comparison, not a substitute for manufacturer-level review.
- Mountain-bike geometry illustration: https://www.leisurewheels.co.uk/m12b0s180p29761/AMFLOW-PL-Carbon-Pro-2026 — useful for the relationship of wheelbase, head tube, seat cluster and frame triangle. Verify the current page and exact model details before relying on any specification.

Record the exact model/page accessed and which visual details were used in the updated audit when rebuilding. Do not claim a reference was consulted unless it was actually inspected.

## Acceptance gate

The phase must remain **visual reconstruction required** until: (a) all five distinct drawings are rendered at equal scale; (b) a cyclist-informed visual review confirms the major assemblies are believable; (c) every interactive region maps to the right part; (d) keyboard/text fallback works; and (e) automated checks run successfully or their blockers are explicitly recorded.
