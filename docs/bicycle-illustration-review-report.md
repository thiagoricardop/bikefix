# Bicycle Illustration Review — 2026-10-28

**Historical decision: REJECT the original artwork for visual release.** This report documents the pre-rebuild source and is retained as an audit trail. On 2026-10-29, the product owner confirmed acceptance of the rebuilt five-type bicycle visuals and reported that Phase 03 had been completed but not logged. Automated verification for the current checkout remains pending; the original rejection below does not describe the current profile-based geometry.

## Scope and evidence

This review assessed the pre-rebuild implementation present on 2026-10-28 in `src/components/bicycle-explorer/interactive-bicycle-svg.tsx` and the concept comparison board at `illustration-review/bicycle-illustration-target-board.svg`. The current source has since been refactored into separate profiles in `src/components/bicycle-explorer/bicycle-svg/profiles/`, and the product owner accepted the updated visuals on 2026-10-29. The details below are retained for audit history only. This was a source-level design review, not a claim that a qualified mechanic reviewed the artwork.

## Findings by bicycle

### Mountain — critical failure, rebuild first

- The current profile reuses the generic wheelbase and nearly the same frame landmarks as the other types.
- The rear shock is a diagonal line between arbitrary points, not a clearly mounted shock integrated with a swingarm and coherent linkage.
- The rear triangle and pivot arrangement do not communicate a recognizable suspension layout.
- The fork reads primarily as one diagonal stroke with decorative parallel lines; a recognizable suspension fork needs crown, stanchions and lower legs.
- The drivetrain is not mechanically legible: cassette rings are centered on the axle, the chain is represented by straight segments, and derailleur/pulley routing is unclear.
- Brake hardware does not convincingly show caliper-to-rotor contact.
- **Acceptance target:** modern full-suspension 29er trail bike silhouette, broad knobby tires, wide flat bar, suspension fork, integrated rear shock and linkage, hub-concentric rotors, wide-range cassette, derailleur cage, and plausible chain path.

### Road — high-priority failure

- The frame points and general stance are inherited from the generic geometry rather than a road-specific fit.
- The drop bar is a small loop and lacks clearly recognizable hoods and usable drops.
- Slim tires alone do not establish a road-bike silhouette; the cockpit should be lower/longer and the fork slim and rigid.
- **Acceptance target:** light endurance-road frame, narrow slick tires, rigid fork, identifiable drop-bar/hood assembly, and plausible road drivetrain/brakes.

### Hybrid / commuter — high-priority failure

- It reads as the same diamond frame with modest coordinate tweaks, not a distinctly upright everyday bike.
- The flat bar is not enough to distinguish the profile; utility features are too weakly integrated to define the category.
- A rear rack/fenders must connect to credible mounting points and follow wheel clearance.
- **Acceptance target:** more upright cockpit and frame proportions, medium smooth/light-tread tires, rigid fork, flat bar, and restrained but integrated rack/fender/light details.

### Gravel — high-priority failure

- It is too close to the road profile except for tire width.
- The handlebar does not show meaningful flare at the drops; frame/fork tire clearance and relaxed endurance geometry are not legible.
- **Acceptance target:** flared drop bars, medium-wide tires, visible clearance, relaxed road-like geometry, rigid fork, disc brake hardware, and a coherent 1x or 2x drivetrain.

### E-bike — high-priority failure

- Electrical parts are added as shapes to a generic frame instead of being designed around a declared subtype.
- The battery intersects the visual frame/drivetrain area without reading as a well-integrated downtube battery; the motor is a circle around the bottom bracket rather than a plausible mid-drive housing.
- Cockpit control/display and practical trekking equipment are not coherently integrated.
- **Acceptance target:** a declared mid-drive trekking/commuter subtype with a battery following the downtube/frame envelope, a credible motor housing around the bottom bracket, suitable flat bar/control display, and an otherwise mechanically plausible bicycle.

## Cross-cutting defects

1. The five types share too many principal landmarks; geometry differences are mostly boolean style flags.
2. The wheel detail is decorative: spoke attachment, hub flange, cassette and rotor hierarchy are not convincing at rendered size.
3. Brake, chain, cassette, derailleur and crank relationships are ambiguous.
4. The single large conditional SVG component makes type-specific geometry hard to reason about and review.
5. Interaction and canonical IDs are a useful foundation, but correct hit mapping does not compensate for incorrect visible anatomy.

## Required implementation plan

1. Extract a shared interaction/accessibility layer and low-level SVG primitives.
2. Define five separate geometry modules, each with named landmarks and its own frame, fork, cockpit and equipment.
3. Rebuild the mountain bike first because its full-suspension layout is the hardest acceptance test; then independently rebuild road, hybrid, gravel and e-bike.
4. Draw wheel/hub/rim/spokes, disc rotor/caliper, cassette/chain/derailleur/crank as mechanically connected assemblies.
5. Preserve canonical component IDs, remove hit regions for absent parts, and test hit-region alignment/keyboard behavior.
6. Render all five at identical scale and compare silhouette-only versions before adding colors/details.
7. Record reference URLs actually inspected and what each informed. Do not claim research or expert review that did not happen.
8. Run typecheck, lint, unit tests, production build and Playwright checks; report exact blockers.

## Historical release gate (2026-10-28)

The original gate blocked visual acceptance until the five profiles passed the visual checklist in `docs/bicycle-illustration-spec.md`. On 2026-10-29, the product owner confirmed that the rebuilt visuals were accepted and Phase 03 should be logged complete. The remaining open item is automated verification in a compatible environment; this historical visual gate is not current release status.
