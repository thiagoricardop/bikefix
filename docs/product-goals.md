# BikeFix — Product Goals

## Vision
Help people with little or no bicycle-mechanical experience identify bicycle components, understand common symptoms, and follow clear, visual repair instructions with appropriate safety boundaries.

## Primary user journey
1. Select a bicycle type, or choose “I'm not sure.”
2. Select a component on the interactive SVG or use text search.
3. Choose a symptom and answer only relevant follow-up questions.
4. Review suitable repair guides and applicability notes.
5. Follow numbered steps, media, checkpoints, and final checks.
6. If no appropriate guide exists, submit a repair-guide request and receive an honest confirmation of its recorded status.

## Supported bicycle types
- Road bike.
- Mountain bike.
- Hybrid / commuter bike.
- Gravel bike.
- E-bike.
- Unsure / other fallback.

Each visual variant must reflect common geometry and appropriate components, but must not assume that every bicycle of a type uses the same brake, drivetrain, suspension, tire, or electrical system.

## MVP outcomes
- A cohesive responsive homepage and navigation.
- A genuinely interactive SVG explorer with independent component regions.
- A shared and validated component/symptom/guide model.
- Text-based component navigation and direct symptom search.
- Deterministic, testable diagnosis for supported cases.
- Structured repair guides with media fallbacks, warnings, source references, and truthful review status.
- A request-a-repair-guide flow with validation, secure durable storage, developer notification, anti-spam measures, and honest success/failure handling.
- Keyboard and touch accessibility for essential journeys.
- Automated tests and reproducible setup documentation.

## Initial content target
At least eight structured draft or reviewed guides covering: flat tire/inner tube, rubbing rim brakes, rubbing mechanical disc brakes, basic rear derailleur indexing, chain cleaning/lubrication, saddle height, handlebar/stem positioning symptoms, and wheel wobble/rubbing symptoms. Source and review each procedure before presenting it as verified.

## Non-goals for the initial MVP
- An AI-only diagnosis flow.
- A vector database without demonstrated retrieval needs.
- Required user registration to read a guide.
- Community publishing without moderation.
- Unreviewed model-generated repair instructions presented as verified.
- Unlicensed copying or rehosting of third-party videos, text, or illustrations.
- Claims that a completed checklist certifies a bicycle as safe.

## Success criteria
Success means users can complete the primary user journey on desktop and mobile, alternative navigation remains available, broken media does not block guidance, and missing-guide requests are stored privately and delivered through a configured notification workflow. These claims require test evidence; visual polish alone is insufficient.
