# Agentic coding readiness checklist

**Audit date:** 2026-11-01.
**Scope:** prepare KarmaCircle for dependable work across Claude and Codex, including backend, frontend, and UI changes.

This checklist tracks repository readiness, not the completion of any one feature.
Check an item only when the repository or its GitHub settings provide evidence that it is done.

## Status key

- `[x]` Done and verified.
- `[~]` Partly in place or needs a follow-up.
- `[ ]` Not done yet.
- `[external]` Requires a GitHub or account setting outside the repository.

## Current readiness summary

KarmaCircle has strong architecture notes, feature specs, known-issue records, design-system guidance, and isolated API and browser test suites.
This first readiness pass aligns Claude and Codex instructions and adds pull request validation.
The first pull request CI run and Vercel preview both pass.
GitHub branch protection, secret scanning, and outside-collaborator workflow approval still need owner-side review.

### Verification evidence

- `pnpm install --frozen-lockfile` passes with the declared pnpm version.
- `pnpm lint` passes; only conditional assertions in responsive E2E tests still warn.
- Fixed autofixable Tailwind warnings and scoped two plugin false positives around valid display line-height ratios; browser visual review remains pending.
- API and frontend type checks pass.
- The root `pnpm type-check` command now covers both apps through Turbo.
- `pnpm build` passes; Vite reports a large frontend bundle that should be reviewed as a performance follow-up.
- The production CSS contains the intended `leading-[1.05]`, `leading-[1.1]`, and `leading-[1.12]` rules; the unsupported bare classes are absent.
- The isolated API test suite passes.
- GitHub confirms every pinned action SHA resolves to a commit object.
- The browser E2E suite passed in PR #1380; visual design review remains pending because no product UI was changed and local browser review needs Tamal's explicit authorization.
- PR #1380 passed frozen install, lint, type-check, builds, API tests, browser E2E, and the Vercel preview deployment.
- The CI validation job completed successfully in 10m 27s on 2026-11-01.
- GitHub currently reports Dependabot alerts and security updates enabled.
- GitHub currently reports secret scanning and push protection disabled, no branch protection or repository rulesets, private vulnerability reporting disabled, and default workflow permissions set to read-write.
- The repository API did not expose the outside-collaborator workflow approval setting; confirm it in GitHub settings.

## 1. Shared Claude and Codex instructions

- [x] Keep shared project rules in root `AGENTS.md`.
- [x] Make `CLAUDE.md` point to `AGENTS.md` and serve as a supplemental navigation and convention guide.
- [x] Use one rule for branch creation, commits, pushes, merges, and pull requests across both tools.
- [x] Use one communication-style rule across both tools.
- [x] Point both tools to the same UI quality checklist, app maps, and known-issue docs.
- [x] Review shared instructions for conflicts; keep model-specific setup limited to tool-specific entry points.
- [ ] Confirm Claude Code and Codex both load their entry-point files in a clean checkout.

## 2. Task intake and acceptance criteria

- [x] Link contributors to open issues from the README.
- [x] Explain how to claim work and wait for maintainer assignment in `CONTRIBUTING.md`.
- [x] Collect task expected outcome and relevant project area in the issue forms.
- [x] Add explicit acceptance criteria to feature, bug, and documentation issues, including relevant edge cases.
- [x] Ask feature authors to name non-goals, constraints, affected user types, and supported platforms when they matter.
- [~] Ask for user flow and UI states in feature issues; responsive and accessibility checks are required by the pull request template.
- [x] Add a reusable pull request checklist for acceptance criteria, checks, docs, UI review, and AI disclosure.
- [x] Ask maintainers to split broad product work into linked issues before assigning it.
- [ ] Require maintainers to assign and maintain WOCS difficulty labels before eligible pull requests merge.

## 3. Code and product context

- [x] Maintain a frontend feature map and per-feature specs under `docs/specs/`.
- [x] Maintain a backend module map, API contract, and module specs under `apps/api/docs/specs/`.
- [x] Keep known issues visible for both apps and tell agents to check them before editing.
- [x] Document the monorepo boundary and keep the API contract as backend source of truth.
- [x] Keep a graphify map for navigation across code and docs.
- [~] Treat the graph as a navigation aid and verify claims against current code and specs; generated graph summaries can lag or use generic community names.
- [ ] Assign an owner or review cadence for feature specs, known issues, and setup guides.
- [~] Remove obsolete implementation notes when code changes; the stale Turbo note is corrected and the old backend handoff is marked superseded, but the full docs set still needs review.
- [ ] Keep stated file counts, test counts, route counts, and other changing numbers out of prose unless the source of truth generates them.

## 4. UI quality checklist

Use this checklist for every pull request that changes user-facing UI.

### Before implementation

- [ ] Read the feature spec and `docs/specs/design-system/README.md`.
- [ ] Identify the user, the task they need to complete, and the UI states affected.
- [ ] Reuse existing components, tokens, patterns, and interactions where they fit.
- [ ] Record acceptance criteria for loading, empty, success, error, disabled, and permission states that apply.
- [ ] Identify keyboard, assistive-technology, reduced-motion, and responsive needs before coding.

### Visual and responsive review

- [ ] Review at the narrowest supported width, including 320-375px where the screen allows it.
- [ ] Review a tablet width and a standard desktop width.
- [ ] Review wide layouts for readable line length, sensible content width, and balanced whitespace.
- [ ] Check alignment, spacing, typography, contrast, hierarchy, text wrapping, and icon consistency.
- [ ] Confirm focus indicators, keyboard navigation, labels, button names, and semantic structure.
- [ ] Confirm zoom and text enlargement do not hide content or actions.
- [ ] Check reduced-motion behavior for animation or scroll-linked effects.
- [ ] Capture before/after screenshots at the affected sizes when visual review is authorized and useful.
- [ ] Avoid adding an automated visual baseline until the team has selected stable browsers, viewports, fonts, and update ownership.

### UI verification and reporting

- [x] Keep browser E2E tests isolated from local development services and databases.
- [ ] Run relevant browser tests and inspect screenshots or traces for UI changes when authorized.
- [ ] Respect the repo's user preference: do not open a local browser or test the UI without explicit authorization.
- [ ] If visual review was not authorized or could not run, say so plainly and leave that review marked pending.
- [ ] Include viewport sizes and the checks performed in the pull request summary.

## 5. Automated validation and CI

- [x] Keep API Jest/Supertest and frontend Playwright suites documented and isolated.
- [x] Run workspace lint, API and frontend type checks, builds, and both test suites in `.github/workflows/ci.yml` for pull requests.
- [x] Use the `pull_request` event, read-only permissions, no repository secrets, and full-SHA-pinned actions for PR validation.
- [x] Upload browser failure artifacts for debugging.
- [x] Confirm the first CI run passes on a pull request; PR #1380 passed the full workflow on 2026-11-01.
- [external] Require `CI / validate` in branch protection for `main`; current GitHub API check found no branch protection or repository ruleset.
- [external] Decide whether the `dev` branch also needs required checks and protection.
- [x] Add a frontend lint script and run it in PR CI.
- [~] Tailwind lint warnings are cleared or scoped around valid display ratios; redesign conditional responsive E2E assertions before setting a zero-warning threshold.
- [ ] Track flaky tests and fix or quarantine them with an owner and expiry date.
- [ ] Keep test data isolated; never use real user data, local developer databases, or real email in CI.

## 6. Security and safe agent actions

- [x] Keep the CI workflow free of deployment secrets and write permissions.
- [x] Run untrusted pull request code only from `pull_request`, not `pull_request_target`.
- [x] Pin actions used by the CI workflow to full commit SHAs.
- [x] Document approval boundaries for external messages, merges, deployments, and GitHub settings.
- [x] Pin all active third-party GitHub Actions to full commit SHAs across every workflow.
- [external] Enable secret scanning and push protection; both are currently disabled.
- [x] Enable Dependabot alerts and security updates; GitHub currently reports both enabled.
- [x] Configure Dependabot to propose weekly updates for pinned GitHub Actions and the pnpm workspace dependencies.
- [external] Require approval for outside-collaborator workflow runs; this setting still needs manual confirmation.
- [external] Enable private vulnerability reporting; GitHub API currently reports it disabled.
- [external] Protect `main` with required review and the `CI / validate` status check; no branch protection or repository ruleset currently exists.
- [external] Change the repository default workflow token permission from read-write to read-only; the current CI workflow has explicit read-only permissions.
- [ ] Review repository and organization secrets for least privilege and rotate any credential exposed by old workflow paths.

## 7. Reproducible development environment

- [x] Pin pnpm in the root package manifest and document supported Node.js versions.
- [x] Document local frontend, backend, and MongoDB setup.
- [x] Provide root scripts for build and test execution.
- [~] Verify every root script maps to a real workspace script and behaves consistently on a clean checkout; root `dev` still needs an isolated smoke run.
- [ ] Document environment variables without copying real secrets into tracked files.
- [x] Keep setup steps and package-manager instructions consistent across the contributor and app-specific guides.
- [x] Provide a clean-checkout smoke procedure using frozen install and isolated tests that do not touch production or a developer's local database.

## 8. Pull request and release workflow

- [x] Enforce conventional pull request titles with a dedicated workflow.
- [x] Explain issue links, review expectations, and test reporting in `CONTRIBUTING.md`.
- [x] Provide `.github/PULL_REQUEST_TEMPLATE.md` with summary, issue link, acceptance criteria, validation, UI review, and AI disclosure.
- [x] Document WOCS labels and apply them before eligible pull requests merge.
- [x] Require a pull request summary of changed behavior, checks run, and known limitations.
- [x] Request screenshots or other visual evidence when they materially help review a UI change.
- [external] Confirm `CI / validate` is a required status check before relying on it as a merge gate.
- [ ] Keep deployment workflows separate from validation; only deploy after required checks and approvals.

## 9. Current first-pass actions

- [x] Create this tracked checklist.
- [x] Align root agent instruction ownership and remove branch/style conflicts between `AGENTS.md` and `CLAUDE.md`.
- [x] Add pull request CI for lint, types, builds, and existing test suites.
- [x] Update testing and security docs to describe the new workflow.
- [x] Confirm the CI workflow with PR #1380; its full validation check passed.
- [external] Require its check in GitHub branch protection before treating CI as a merge gate.
- [x] Add acceptance-criteria and user-flow fields to issue forms.
- [x] Pin active GitHub Actions and configure automated dependency update proposals.
- [ ] Work through the remaining UI checklist.
