# Contributing to BikeFix

Thank you for helping improve BikeFix. The project is pre-release and places particular importance on bicycle-mechanical accuracy, privacy and honest content status.

## Before opening a change

1. Read `AGENTS.md`, `docs/architecture.md` and the relevant acceptance criteria.
2. Keep pull requests focused and explain the user-facing problem they solve.
3. Do not add dependencies or external services without explaining why they are needed.
4. Never commit `.env` files, credentials, private repair-request data, customer information, or generated local state.

## Repair content changes

Repair procedures require traceable authoritative sources and review by a qualified bicycle mechanic before they can be marked reviewed or published. Include the applicable bicycle/component scope, tools, prerequisites, safety warnings, stop conditions, final checks, media provenance and rights status. Do not invent torque values or make universal compatibility claims.

A source link does not confer permission to copy its wording, illustrations, video or other creative material. Use original or properly licensed assets.

## Code changes

Run the relevant checks before requesting review:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For user journeys or responsive UI changes, also run:

```bash
npx playwright install chromium
npm run test:e2e
```

Do not claim a test passed unless it actually ran and exited successfully. If an environment limitation blocks a check, include the exact command and error in the pull request.

## Pull requests

Use the pull-request template. Describe the change, how it was verified, whether the user journey or content changes, and any remaining limitations. Never enable the production repair-request workflow as part of an unrelated UI or documentation change.
