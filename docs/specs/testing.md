# Testing

`apps/web`'s only automated test tooling is a **Playwright** E2E suite (`apps/web/e2e/`), added September 2026, replacing an earlier Cypress setup (`cypress/e2e/smoke.spec.js`, `organizationSetup.spec.js`) that existed but was never actually wired into CI. There is still no component/unit-test runner for this app — see "What this doesn't cover" below.

This suite is deliberately **full-stack**: a real browser (via Playwright) drives a real, running `apps/web` dev server, which itself makes real HTTP requests to a real, running `apps/api` instance — nothing here is mocked. `apps/api` has its own, separate Jest+Supertest suite for API-level coverage; see [apps/api/docs/specs/testing.md](../../apps/api/docs/specs/testing.md) for that side. Running `pnpm test` from the repo root runs both suites, via Turborepo, at the same time — that's what "test the API and the UI at once" means in this repo.

## Why Playwright, not Cypress

Cypress runs *inside* the browser, which makes cross-origin flows (this app's Google OAuth popup — see [authentication.md](./authentication.md)) and multi-tab scenarios structurally awkward. Playwright drives the browser from outside via CDP, so cross-origin and multi-tab both work naturally, it runs Chromium/Firefox/WebKit from one API (all three run by default here — see `playwright.config.ts`'s `projects`), and it has a native API-request context so the same test runner can also hit REST endpoints directly with no browser involved (`e2e/smoke.spec.ts`'s "Backend reachability" tests do exactly this).

## The stack, and how it stays isolated from real local dev

A developer's normal `pnpm dev` runs the web app on port 3000 and the API on port 5050, against whatever real MongoDB is configured (see [AGENTS.md](../../AGENTS.md) / the memory note on local dev startup). The Playwright suite must never collide with, or read/write, that real session — so it uses **entirely separate, dedicated infrastructure**:

| | Local dev | Playwright e2e |
|---|---|---|
| Web port | 3000 | **3001** |
| API port | 5050 | **5051** |
| Database | a real MongoDB | `mongodb-memory-server`, fresh per run |

- [`apps/web/e2e/env.ts`](../../apps/web/e2e/env.ts) is the single source of truth for the two e2e ports — imported by `playwright.config.ts`, `global-setup.ts`, and every spec file that needs to call the API directly.
- [`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts)'s `webServer` array starts **both** servers itself before any test runs, and tears them down after (locally, `reuseExistingServer: true` keeps them warm across repeated `pnpm test` runs in the same session) — a clean checkout needs nothing running beforehand beyond `pnpm install` and `npx playwright install`.
  - The API entry runs [`apps/api/tests/e2e/server.ts`](../../apps/api/tests/e2e/server.ts) — a real, listening instance of the API backed by `mongodb-memory-server`, distinct from how Jest drives the same `createApp()` in-process with nothing listening. See `apps/api`'s own testing spec for that file's details, including the test-only `POST /__test__/reset` route it exposes.
  - The web entry runs `vite --port 3001 --strictPort` with `VITE_API_URL` overridden to the e2e API's URL, so the dev server built for this run points at the isolated API, not local dev's 5050.
  - Both commands run via `npx <bin>` with an explicit `cwd`, not `pnpm --filter`/`pnpm exec` — pnpm itself isn't guaranteed to be on `PATH` in every environment (this repo's local dev has the same gap; pnpm is invoked via `npx pnpm@<version>` when it isn't installed globally). `npx` resolves each package's own local devDependency bin from its own `node_modules/.bin` regardless of what's on `PATH`.
- [`apps/web/e2e/global-setup.ts`](../../apps/web/e2e/global-setup.ts) runs once, after the servers are up and before any test, and `POST`s the e2e API's `/__test__/reset` — guaranteeing the suite starts from an empty database every run.

## Why no reset *between* spec files

Playwright runs spec files in parallel across workers by default (`fullyParallel: true`). A mid-suite database reset would race whichever other file's tests are running concurrently, so there isn't one. Instead, each spec generates its own unique data — a `Date.now()`-based suffix on emails and organization names (see `e2e/organization-setup.spec.ts`'s `stamp`/`suffix`) — the same isolation pattern the Cypress specs this suite replaced already used, kept because it's still the right approach under Playwright's parallelism.

## The spec files

| File | Covers |
|---|---|
| [`e2e/smoke.spec.ts`](../../apps/web/e2e/smoke.spec.ts) | Backend reachability (`/organizations`, `/organizations/taxonomy` via the API request context, no browser) + basic navbar navigation |
| [`e2e/organization-setup.spec.ts`](../../apps/web/e2e/organization-setup.spec.ts) | The full organization lifecycle: sign up, stay hidden as a draft, fill in the required fields one question at a time, go live, appear in the directory, come back to edit. Ported from the old Cypress `organizationSetup.spec.js` |

`cypress/walkthrough/organizationJourney.spec.js` (a paced demo-recording spec, not a regression test) was **retired, not ported** — Playwright's own trace viewer and `--headed`/video output (`CAPTURE_TOUR=1 pnpm test`, which the `tour()` helper in `organization-setup.spec.ts` checks) cover the same "watch it happen" need without a second, redundant spec.

## Running it

From `apps/web`, or from the repo root with `--filter karmacircle-frontend`:

- `pnpm test` — headless, all three browser projects, matches CI.
- `pnpm test:ui` — Playwright's interactive UI mode (time-travel through a run, pick a single test).
- `pnpm test:headed` — headed (visible) browser windows.
- `pnpm test:report` — reopen the last run's HTML report.
- `CAPTURE_TOUR=1 pnpm test` — also saves numbered screenshots of the organization-setup journey into `test-results/tour/`.

From the repo root, plain `pnpm test` runs this suite **and** `apps/api`'s Jest suite together (Turborepo runs each workspace's own `test` script; neither depends on the other, so they run concurrently) — 15 Playwright tests and 73 Jest tests, in roughly the same wall-clock time as either alone.

CI is not wired up for this suite yet (as of September 2026) — it exists and passes locally/on demand, but no GitHub Actions workflow runs it automatically. `web-prtests.yml` still has a *disabled* Cypress job commented out from before this migration; wiring Playwright into CI is a deliberate, separate decision, not implied by this suite existing.

## Known sharp edges (found while building this suite)

Real, current app behavior the suite had to be written against — not aspirational — and two genuine bugs the suite surfaced along the way (see [known-issues.md](./known-issues.md) for the full writeups):

- **Playwright's `getByRole` respects real ARIA semantics; Cypress's `cy.contains("button", …)` didn't.** The signup flow's account-type switch is a `role="tab"` pair (a deliberate design choice — see `Auth.tsx`), not `role="button"`, even though it's a `<button>` element. The old Cypress test matched on the raw tag and never noticed; `getByRole("tab", …)` is the correct selector.
- **Playwright is strict about ambiguous matches; Cypress silently took the first one.** `getByText(...)` throws if more than one element matches — several assertions need `.first()`, `{ exact: true }`, or a role-scoped locator (`getByRole("heading", …)`) where Cypress's `cy.contains()` would have quietly picked an element and moved on. Watch for this especially with short/common words ("Live" collides with the setup page's rotating testimonial quote, which can contain "live" as a substring — see `setupAsideQuotes.ts`).
- **`OrganizationSetup.tsx`'s Continue button is `disabled` when a required question is blank**, not clickable-with-an-explanation the way [organizations.md](./organizations.md#behaviours-worth-keeping-if-this-is-rewritten-again) still describes — the red `setup-required-note` message this suite's predecessor exercised is now dead code, unreachable through the UI. See known-issues.md.
- **`back()` from the first setup question is a no-op for a live organization**, not a route back to the intro screen — `goToIntro()`'s cleared URL params immediately re-resolve to the first question again via `useOrganizationSetup`'s own `stage` fallback. See known-issues.md.
- **Use `pressSequentially`, not `fill`, for the city autocomplete field.** The suggestion dropdown is driven by real keystroke events; `fill()` sets the value in one shot and never triggers it. Plain text fields (name, description, email, etc.) work fine with `fill()`.

## What this doesn't cover

- No component or hook-level unit tests exist for `apps/web` — Playwright's E2E suite is the only automated coverage. If you're asked to add test coverage for a component or hook in isolation, there's no existing pattern to follow; introducing a unit-test runner (Vitest, most likely, given the Vite toolchain) is a separate decision, not something to do incidentally while fixing something else.
- Only the organization signup/setup journey has E2E coverage today. Authentication (sign in, password reset), events, donations/payments, and the individual-user profile flows have no Playwright specs yet.
- Google OAuth sign-in isn't covered — it needs a real (or mocked) Google consent screen, which this suite doesn't attempt.

## Keeping this file honest

If you add a spec file, add it to the table above. If you change the dedicated ports, the reset strategy, or the browser projects, update this file and [apps/api/docs/specs/testing.md](../../apps/api/docs/specs/testing.md) together — they describe two ends of one integration. If you fix one of the "known sharp edges" bugs above, remove it from here and from [known-issues.md](./known-issues.md) in the same change, per that file's own "Keep this file honest" section.
