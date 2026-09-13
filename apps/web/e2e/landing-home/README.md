# Landing & Home — E2E coverage

Playwright specs for `apps/web/src/features/landing-home/`. See [docs/specs/landing-home.md](../../../../docs/specs/landing-home.md) — this is a mostly-static marketing page (no live data behind the three sections between the hero and the footer), so coverage here leans toward presence/structure checks rather than behavioral ones.

## Files

| File | Covers |
|---|---|
| [hero.spec.ts](./hero.spec.ts) | The one thing about `Landing.tsx`'s hero that actually branches on data: the CTA button reads Redux's `isLoggedIn` to choose "Sign up Today !" → `/auth/signup` vs. "Explore our organizations" → `/organizations` |
| [sections.spec.ts](./sections.spec.ts) | `Home.tsx`'s page structure (hero + `HowItWorks`/`DrivesRail`/`OpenSource` all present and in order), and `Footer.tsx`'s newsletter form |

Basic navbar link navigation (Organizations, Events) is covered by [../smoke.spec.ts](../smoke.spec.ts), not duplicated here.

## Test data

`hero.spec.ts`'s logged-in test goes through the **real signup UI**, not an API-seeded account — `isLoggedIn` lives in Redux (persisted to `localStorage` via `redux-persist`), and only the app's own login/signup action sets it. Seeding an account directly against the API (the way `authentication/signin.spec.ts` does) sets up a *database* record but touches no client state at all, so the hero would still render logged-out.

## What's not covered, on purpose

- **Animation/motion** — the GSAP entrance tweens, scroll-linked parallax, the `DrivesRail` marquee's drift, `prefers-reduced-motion` handling, and `HeroScene`'s CSS grid layer. All decorative, all documented in detail in `landing-home.md` and each component's own comments; none of it is asserted on here. If a future regression in this area needs a regression test, visual snapshot testing (not currently set up anywhere in this repo) would be the right tool, not a DOM assertion.
- **Responsive breakpoints** — `landing-home.md` documents two real historical bugs at the `max-500px` breakpoint (hero alignment, hero padding), both fixed. Neither has a regression test here yet; `playwright.config.ts` doesn't currently run any project at a mobile viewport. Worth adding if this breakpoint regresses again.
- **The `sampleDrives` content itself** — illustrative placeholder data (see `landing-home.md`), not worth pinning specific card copy to a test that would need updating every time the placeholder content changes.

## Keeping this honest

If `Landing.tsx`, `Home.tsx`, or `Footer.tsx`'s newsletter form changes in a way that changes what's asserted here, update the relevant spec in the same change. If a newsletter endpoint is ever actually wired up (see `known-issues.md`), `sections.spec.ts`'s "no-op" framing needs updating too — it's currently asserting the *absence* of a backend, not a business rule.
