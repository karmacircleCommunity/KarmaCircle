# Agentic coding readiness checklist

**Audit date:** 2026-11-02.
**Scope:** prepare KarmaCircle for dependable work across Claude and Codex, including backend, frontend, and UI changes.

This checklist tracks repository readiness, not the completion of any one feature.
Check an item only when the repository or its GitHub settings provide evidence that it is done.

## Status key

- `[x]` Done and verified.
- `[~]` Partly in place or needs a follow-up.
- `[ ]` Not done yet.
- `[external]` Requires a GitHub or account setting outside the repository.

## Top priorities

1. **Make project guides trustworthy:** map repository guides and specs to the code and Miro flows, correct stale or conflicting details, and set a light review cadence.
2. **Make the project easy and safe to start:** verify clean setup, document required environment settings, and smoke-check the root development workflow without using production or personal data.
3. **Close security gaps:** enable secret scanning and push protection, set workflow tokens to read-only by default, confirm outside-contributor workflow approval, review repository secrets, and resolve private vulnerability reporting.

## Core readiness progress

The UI quality checklist in section 4 is an on-demand guide for UI work, not an agentic-readiness requirement, so it is excluded from this score.
Section 9 is a roll-up of completed first-pass work, so it is excluded to avoid counting the same work twice.
Score completed items in sections 1-3 and 5-8 as 1, partial items as 0.5, and open or external items as 0, divided by all scored items.
After changing checklist statuses, run `pnpm readiness:score` to regenerate the score and item counts from those statuses.

`[█████████░] 93%` (57 done, 3 partial, 3 open or external; 63 scored items).

## Current readiness summary

KarmaCircle has architecture notes, feature specs, known-issue records, design-system guidance, and isolated API and browser test suites.
The repository instructions align across tools, and pull request validation runs in GitHub Actions.
The `main` ruleset requires pull requests, one approval, resolved review threads, and the `validate` check for everyone except Tamal, who can push directly.

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
- Browser E2E passed in PR CI; local visual review remains pending because it needs Tamal's explicit authorization.
- Pull request #1380 passed the full GitHub Actions validation workflow and Vercel preview on 2026-11-01.

## 1. Shared Claude and Codex instructions

- [x] Keep shared project rules in root `AGENTS.md`.
- [x] Make `CLAUDE.md` point to `AGENTS.md` and serve as a supplemental navigation and convention guide.
- [x] Use one Git rule across both tools: Tamal works directly on `main`; everyone else uses pull requests for changes to `main`.
- [x] Use one communication-style rule across both tools.
- [x] Point both tools to the same UI quality checklist, app maps, and known-issue docs.
- [x] Link a project-specific AI-assisted development guide from the README.
- [x] Review shared instructions for conflicts; keep model-specific setup limited to tool-specific entry points.
- [~] Verify both tools load root instructions from an isolated temporary repository; Codex read `AGENTS.md`, while Claude Code's runtime check awaits reauthentication. Its documented `@AGENTS.md` import is present.

## 2. Task intake and acceptance criteria

- [x] Link contributors to open issues from the README.
- [x] Explain how to claim work and wait for maintainer assignment in `CONTRIBUTING.md`.
- [x] Collect task expected outcome and relevant project area in the issue forms.
- [x] Add explicit acceptance criteria to feature, bug, and documentation issues, including relevant edge cases.
- [x] Ask feature authors to name non-goals, constraints, affected user types, and supported platforms when they matter.
- [x] Require feature requests to describe user flow, applicable UI states, responsive needs, and accessibility needs, or mark them N/A for backend-only work.
- [x] Add a reusable pull request checklist for acceptance criteria, checks, docs, UI review, and AI disclosure.
- [x] Ask maintainers to split broad product work into linked issues before assigning it.
- [ ] Require maintainers to assign and maintain WOCS difficulty labels before eligible pull requests merge.

## 3. Code and product context

- [x] Maintain a frontend feature map and per-feature specs under `docs/specs/`.
- [x] Maintain a backend module map, API contract, and module specs under `apps/api/docs/specs/`.
- [x] Keep known issues visible for both apps and tell agents to check them before editing.
- [x] Document the monorepo boundary and keep the API contract as backend source of truth.
- [x] Keep a graphify map for navigation across code and docs.
- [x] Treat graph output as navigation clues only; verify important claims against current code and specs. Audit on 2026-11-02 found stale inferred hyperedges and AST labels, while node/link counts agree with `graph.json`.
- [x] Assign an owner and quarterly review cadence for feature specs, known issues, setup guides, and linked flow diagrams.
- [x] Remove or mark obsolete implementation notes when code changes; focused 2026-11-02 audit corrected the address-provider, removed-profile, and graph-guidance drift found in older notes.
- [x] Keep stated file counts, test counts, route counts, and other changing numbers out of prose unless the source of truth generates them; readiness counts now generate from checklist statuses, test totals stay in CI output, and performance measurements live in the dated audit.

## 4. UI quality checklist

Use this checklist when doing user-facing UI work.
It is a reusable quality guide, not a requirement for general agentic-coding readiness.

### Before implementation

- [ ] Read the feature spec and `docs/specs/design-system/README.md`.
- [ ] Identify the primary user, the task they need to complete, and applicable UI states before implementation.
- [ ] Reuse existing components, tokens, patterns, and interactions where they fit.
- [ ] Record acceptance criteria for loading, empty, success, error, disabled, and permission states that apply.
- [ ] Identify keyboard, assistive-technology, reduced-motion, and responsive needs before coding.

### Visual and responsive review

- [ ] Review at the narrowest supported width, including 320-375px where the screen allows it.
- [ ] Review a tablet width and a standard desktop width.
- [ ] Review wide layouts for readable line length, sensible content width, and balanced whitespace.
- [ ] Check alignment, spacing, typography, contrast, hierarchy, text wrapping, and icon consistency.
- [ ] Confirm focus indicators, keyboard navigation, labels, button names, and semantic structure.
- [ ] Check touch targets and pointer/touch interactions on supported small screens.
- [ ] For forms, check invalid input, inline and server errors, focus on invalid fields, pending state, and success feedback.
- [ ] Check representative content extremes, including long text, missing optional data, and empty results.
- [ ] Confirm zoom and text enlargement do not hide content or actions.
- [ ] Check reduced-motion behavior for animation or scroll-linked effects.
- [ ] Capture before/after screenshots at the affected sizes when visual review is authorized and useful.
- [ ] Avoid adding an automated visual baseline until the team has selected stable browsers, viewports, fonts, and update ownership.

### UI verification and reporting

- [x] Keep browser E2E tests isolated from local development services and databases.
- [ ] Run relevant browser tests and inspect screenshots or traces for UI changes when authorized.
- [ ] Respect the repo's user preference: do not open a local browser or test the UI without explicit authorization.
- [ ] If visual review was not authorized or could not run, say so plainly and leave that review marked pending.
- [ ] Include exact viewport sizes, UI states, and checks performed in the pull request summary.

## 5. Automated validation and CI

- [x] Keep API Jest/Supertest and frontend Playwright suites documented and isolated.
- [x] Run workspace lint, API and frontend type checks, builds, and both test suites in `.github/workflows/ci.yml` for pull requests.
- [x] Use the `pull_request` event, read-only permissions, no repository secrets, and full-SHA-pinned actions for PR validation.
- [x] Upload browser failure artifacts for debugging.
- [x] Confirm CI passes on a pull request; PR #1380 passed the full validation workflow.
- [x] Require the `validate` check, one approval, and resolved review threads for pull requests to `main`; Tamal has the only direct-push bypass.
- [external] Decide whether the `dev` branch also needs required checks and protection.
- [x] Add a frontend lint script and run it in PR CI.
- [~] Tailwind lint warnings are cleared or scoped around valid display ratios; redesign conditional responsive E2E assertions before setting a zero-warning threshold.
- [ ] Track flaky tests and fix or quarantine them with an owner and expiry date.
- [x] Keep test data isolated; never use real user data, local developer databases, or real email in CI.

## 6. Security and safe agent actions

- [x] Keep the CI workflow free of deployment secrets and write permissions.
- [x] Run untrusted pull request code only from `pull_request`, not `pull_request_target`.
- [x] Pin actions used by the CI workflow to full commit SHAs.
- [x] Document approval boundaries for external messages, merges, deployments, and GitHub settings.
- [x] Pin all active third-party GitHub Actions to full commit SHAs across every workflow.
- [x] Enable secret scanning and push protection; GitHub reports both enabled.
- [x] Enable Dependabot alerts and security updates; GitHub API confirms both are enabled.
- [x] Configure Dependabot to propose weekly updates for pinned GitHub Actions and the pnpm workspace dependencies.
- [x] Enable private vulnerability reporting; GitHub reports it enabled.
- [x] Require approval for all external contributors' workflow runs; GitHub reports `all_external_contributors`.
- [x] Set the repository default workflow token permission to read-only; GitHub reports `read`.
- [~] Review repository and organization secrets for least privilege and rotate exposed credentials; organization secrets were reviewed, the exposed `VERCEL_TOKEN` was replaced in both repositories and deployment history checked, the Atlas password for the historical URI was rotated, and a new Geoapify key is origin-restricted, live-checked, and deployed to production; provider restrictions on legacy Vercel Geoapify values remain unverified. Tamal accepts the historical key's residual exposure and has decided not to pursue recovery or revocation.

## 7. Reproducible development environment

- [x] Pin pnpm in the root package manifest and document supported Node.js versions.
- [x] Document local frontend, backend, and MongoDB setup.
- [x] Provide root scripts for build and test execution.
- [x] Verify every root script maps to a real workspace script and behaves consistently on a clean checkout; all root scripts were exercised on 2026-11-02.
- [x] Document environment variables without copying real secrets into tracked files; examples use local-only placeholders and no longer include a shared Geoapify key.
- [x] Keep setup steps and package-manager instructions consistent across the contributor and app-specific guides.
- [x] Provide a clean-checkout smoke procedure using frozen install and isolated tests that do not touch production or a developer's local database.

### Priority 2 follow-up evidence (2026-11-01 to 2026-11-02)

- Root `dev`, `build`, `lint`, `type-check`, and `test` tasks map to scripts present in both workspace apps.
- Local setup examples target only `localhost` MongoDB; no preloaded records or real credentials are needed for startup. Docker is documented as an optional way to run MongoDB.
- On 2026-11-02, `pnpm install --frozen-lockfile` completed with Node.js 22.23.4 and the pinned pnpm 11.22.0.
- The clean-checkout root `build`, `lint`, `type-check`, and `test` scripts passed; lint reported existing conditional-assertion warnings. API and browser test suites passed across Chromium, Firefox, and WebKit; consult the recorded CI run for exact counts.
- Clean-checkout root `dev` started both apps using temporary ports 3100 and 5150 and a separate `karmacircle_script_check` database; `/health` returned `{"status":"ok","mongo":"connected"}`.
- The default clean-checkout `dev` attempt could not bind port 3000 because the existing local frontend already owned it; that server was left untouched.

## 8. Pull request and release workflow

- [x] Enforce conventional pull request titles with a dedicated workflow.
- [x] Explain issue links, review expectations, and test reporting in `CONTRIBUTING.md`.
- [x] Provide `.github/PULL_REQUEST_TEMPLATE.md` with summary, issue link, acceptance criteria, validation, UI review, and AI disclosure.
- [x] Document WOCS labels and apply them before eligible pull requests merge.
- [x] Require a pull request summary of changed behavior, checks run, and known limitations.
- [x] Request screenshots or other visual evidence when they materially help review a UI change.
- [x] Keep deployment workflows separate from validation; production, dev, and same-repository preview deployments wait for the reusable CI workflow. Production and dev jobs are limited to their matching branches, and production merges require validation and review under the `main` ruleset.

## 9. Completed first-pass summary (not scored)

- [x] Create this tracked checklist.
- [x] Align root agent instruction ownership and remove branch/style conflicts between `AGENTS.md` and `CLAUDE.md`.
- [x] Add pull request CI for lint, types, builds, and existing test suites.
- [x] Update testing and security docs to describe the new workflow.
- [x] Confirm the CI workflow with PR #1380 and require `validate` in the GitHub `main` ruleset.
- [x] Require acceptance criteria and user-flow/UI-state details in feature issues; ask for the affected flow and state in bug issues.
- [x] Pin active GitHub Actions and configure automated dependency update proposals.

The UI quality checklist above remains available for future UI tasks and does not count toward core readiness progress.
