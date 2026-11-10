# BikeFix — Agent Instructions

## Objective
Build an accessible bicycle-repair education platform whose core journey is bicycle type → component → symptom → diagnosis → reviewed repair guide. Users must also be able to request a missing guide.

## Specialized agents and visual work
- For bicycle drawing quality, use `.github/agents/bicycle-illustration-specialist.agent.md` and follow `docs/bicycle-illustration-spec.md`.
- Treat `docs/bicycle-illustration-audit.md` and `docs/bicycle-illustration-review-report.md` as historical records of the pre-rebuild artwork, not as current blocking defects. The product owner accepted the rebuilt five-profile visuals; re-review all five at desktop and mobile sizes when making material artwork changes. A successful build does not prove drawing accuracy.

## Before changing files
- Read `docs/product-goals.md`, `docs/architecture.md`, relevant acceptance criteria, domain documentation, and tests.
- Inspect the repository and Git status. Preserve unrelated user work.
- Distinguish observed facts from assumptions.
- State the task's acceptance criteria and verification plan before implementation.

## Scope control
- Implement one bounded phase or task at a time.
- Do not start the next phase automatically.
- Prefer the simplest maintainable solution that satisfies the requirements.
- Avoid adding infrastructure, dependencies, accounts, vector databases, or AI features without a current requirement.
- Never present a decorative control, in-memory submission, or placeholder as a complete feature.

## Product invariants
- Support road, mountain, hybrid/commuter, gravel, and e-bike variants plus an unsure fallback.
- Use original or properly licensed interactive SVG assets with stable region-to-component mappings.
- Keep SVG rendering separate from component data, symptom rules, and guide content.
- Keep direct symptom search available as an alternative to diagram interaction.
- The core application must work without an AI API key.
- Media failure must not block essential written instructions.
- Repair requests must be durably stored before success is shown; private submissions must never be publicly readable.

## Mechanical safety and content integrity
- Do not invent torque values, specifications, compatibility claims, or manufacturer-specific procedures.
- Use traceable technical references and mark content accurately as draft, reviewed, or published.
- Do not claim qualified mechanical review unless it occurred.
- Make uncertainty and stop conditions explicit for safety-critical problems.
- Do not treat completion of a checklist as proof that a bicycle is safe.

## Security and privacy
- Validate untrusted input on the server.
- Keep secrets server-side and out of source control and browser bundles.
- Use least-privilege access controls for persistent data.
- Minimize personal information and explain its intended use.
- Do not log secrets or unnecessary personal data.
- Do not expose repair-request records through public routes.

## Verification contract
- Add meaningful tests for behavior, not just rendering.
- Run relevant tests, lint, type checking, and build commands when available.
- Use browser/Playwright checks for important interactive and responsive journeys when available.
- Inspect the complete diff for regressions, unrelated edits, and missing states.
- Do not claim a command, test, browser inspection, commit, notification, or deployment occurred without evidence.
- If verification is blocked, identify exactly what could not be checked and why.

## Completion and handoff
A phase is complete only when its acceptance criteria and required evidence are satisfied or remaining limitations are explicitly accepted. Update the relevant documentation and report observed verification evidence. Do not recreate a private implementation log in the public product repository. Provide the next task, but stop before implementing it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
