# Mobile QA: Auth → Organization Setup (2026-09-08)

Scope: full email → sign-in/sign-up → setup walkthrough on a 375×812 mobile viewport, for both an
Individual and an Organization account, reviewed against
[docs/specs/authentication.md](../specs/authentication.md),
[docs/specs/organizations.md](../specs/organizations.md), and
[docs/specs/ui-kit.md](../specs/ui-kit.md) (design tokens, `Button`, `Combobox`, `SplitPanelLayout`,
Motion).

Method: Browser-pane automation against the local dev servers (web:3000, api:5050), three throwaway
accounts (`kc.qa.individual.20260908@example.com`, `kc.qa.org.20260908@example.com`,
`kc.qa.org3.<timestamp>@example.com`, password `Str0ngPass!word9`) — delete these from the local DB
when done with this report.

No code was changed as part of this pass. This file is a record of what was checked and what was
found; see the prioritized pickup list at the bottom for what to do with it.

## Checklist — what was validated

### Individual account — auth

- [x] Email-first step: Individual/Organization tabs, brand-color underline, `px-9` mobile padding
      token — correct
- [x] Malformed email (`tamal@semen333`) correctly keeps Continue disabled, no crash
- [x] Valid new email routes to the Sign Up (name + password) step
- [x] Name field live-strips digits/punctuation (`Tamal123 QA!!` → `Tamal QA`)
- [x] Password strength meter (Weak/Medium/Strong) reacts correctly live
- [x] Signup succeeds, toast fires, redirects to `/`, Redux/localStorage session populated correctly
- [x] Navbar reflects logged-in state (avatar), mobile account sheet opens
      (Organizations/Events/Profile/Logout)
- [x] Logout clears session, returns to logged-out nav

### Organization account — auth

- [x] Organization tab selection updates copy correctly ("What's your organization called?",
      "Organization name" label)
- [x] Same email/name/password validation as Individual
- [x] Signup call succeeds, account correctly persisted with `userType: "organization"`

### Organization setup wizard (`/organization/setup`) — all 8 questions, both steps

- [x] Intro screen: draft badge, numbered step preview, CTA, de-emphasized "Maybe later" — matches
      the spec's described intent
- [x] Progress bar advances 1→8 correctly, step label updates per step
- [x] Q1 name pre-filled from signup; Q2 textarea autosize + `0/500` counter; Q3 single-choice with
      lettered A–H badges
- [x] Q4 causes: multi-select caps at exactly 5, 6th option correctly disables with
      `aria-pressed="false"` — verified in the DOM, not just visually
- [x] Q5 numeric team-size field
- [x] Q6 location: typing "Kol" ranks Kolkata first (population tie-break within tier, exactly as
      spec'd, not Kolar/Kollam by string length); picking a suggestion correctly fills State
- [x] Q7 contact: phone sanitizer strips letters/junk live and keeps only one leading `+`; malformed
      email/website correctly blocks Continue and shows the right per-field message on a genuine
      blur (a first pass using a synthetic non-bubbling blur event gave a false negative here — the
      real behavior, reverified with a real focus transition, is correct)
- [x] Q8 funding → "Save and publish" → organization actually goes live, redirects to its public
      profile, directory-eligibility rule (`missingFields`) reconciles correctly
- [x] Close (×) button has proper `aria-label`/`title` ("Save and finish later")
- [x] Left brand aside panel correctly hidden below 900px (not just squeezed) on mobile, per spec

### Organization public profile (`/organization/:handle`)

- [x] Cover accent + monogram render (no cover uploaded yet, so accent-gradient fallback is correct)
- [x] Route reachable and 200s immediately post-publish

## Issues found (not fixed — ranked by severity)

### 1. Critical — Organization signups never reach the setup wizard

`RegisterUser` → success → [useAuth.ts:90](../../apps/web/src/features/authentication/hooks/useAuth.ts)
calls `navigate("/organization/setup")` for a new org account, exactly as documented in
[authentication.md](../specs/authentication.md) and as the inline comment there claims was fixed.
Instrumenting `history.pushState` shows it happening — then **2ms later**, something (almost
certainly [DonotRenderWhenLoggedIn.tsx](../../apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx)'s
`<Navigate to="/" />` guard) pushes back to `/`. Net effect: every brand-new organization lands on
the home page instead of the setup flow, with no visible error — the exact "visible double
redirect" race the code comment says was already closed. Reproduced twice with fresh accounts. This
is the entry point to the flow this session's other diff is actively modifying, so it is currently
unreachable through normal signup (only reachable by typing the URL directly, which is how the
wizard itself was tested above).

### 2. Critical — Organization public profile renders almost entirely invisible on first paint

On `/organization/:handle`, every `data-reveal`-tagged element (org name, tagline, meta row, stats,
"What we work on", focus-area chips, the dark "Back this org" sidebar, "Get in touch" card) is stuck
at its pre-animation opacity (0 to ~0.47) indefinitely — confirmed via computed styles, not just
visually. Reproduced on both a client-side redirect (right after "Save and publish") and a hard page
reload, and `prefers-reduced-motion` is confirmed `false`, so that isn't the explanation. Root hook:
[useSectionReveal.ts](../../apps/web/src/hooks/useSectionReveal.ts)
(`ScrollTrigger.batch(..., start:"top 88%", once:true)`). Worth comparing against
[OrganizationProfile.tsx:114](../../apps/web/src/features/organizations/pages/OrganizationProfile.tsx) —
`useSectionReveal(pageRef)` is called with no dependency array, while `Organizations.tsx`/`Events.tsx`
deliberately pass one (per [organizations.md](../specs/organizations.md): "so cards revealed by a
filter change animate in rather than staying at the hook's starting opacity") — this page's content
also arrives asynchronously (the `GET /organizations/{handle}` fetch), the same category of problem.
A user landing here right after finishing setup — the best moment for a first impression — sees a
near-blank page.

### 3. High — Design-system semantic colors defined but not used anywhere for validation/status UI

[ui-kit.md](../specs/ui-kit.md) documents `--color-error` (#a8402f) and `--color-warning` (#8a5a12),
added specifically so error/status text doesn't clash with the brand palette. In practice:

- `text-error` is used nowhere in `apps/web/src` (grepped the whole tree).
- Every inline validation error and required-field asterisk across auth and setup uses raw
  `text-red-500`/`red-600` instead:
  [Auth.tsx:240,346,435,495](../../apps/web/src/features/authentication/pages/Auth.tsx),
  [passwordStrength.ts:27](../../apps/web/src/features/authentication/utils/passwordStrength.ts),
  [ResetPassword.tsx](../../apps/web/src/features/authentication/pages/ResetPassword.tsx),
  [ForgotPassword.tsx:121](../../apps/web/src/features/authentication/pages/ForgotPassword.tsx),
  [SetupFieldLabel.tsx:26](../../apps/web/src/features/organizations/components/setup/SetupFieldLabel.tsx),
  [SetupQuestion.tsx:338](../../apps/web/src/features/organizations/components/setup/SetupQuestion.tsx),
  [OrganizationSetup.tsx:345,392](../../apps/web/src/features/organizations/pages/OrganizationSetup.tsx).
- The "Draft — not visible yet" badge and the "still needed before you can go live" notice both use
  raw `amber-500`/`amber-700` instead of `--color-warning`:
  [OrganizationSetup.tsx:99,404](../../apps/web/src/features/organizations/pages/OrganizationSetup.tsx).

This is exactly the drift `ui-kit.md`'s own "prefer a token" rule warns against — the tokens exist,
were WCAG-checked, and are unused everywhere except toast theming.

### 4. Medium — Mobile account-menu avatar is unreachable by keyboard and has no accessible name

[Navbar.tsx:160](../../apps/web/src/components/Navbar.tsx): the mobile trigger is a bare
`<img alt="" tabIndex={-1}>`, 30×30 CSS px. No `role="button"`, no `aria-label`, explicitly removed
from tab order, and under the 44×44 (and even the 24×24 AA) touch-target guidance. A keyboard or
screen-reader user cannot open the account menu on mobile at all.

### 5. Medium — "Maybe later" on the setup intro fails WCAG AA contrast and touch-target size

[SetupIntro.tsx:87-90](../../apps/web/src/features/organizations/components/setup/SetupIntro.tsx):
10px text at `text-ink/40` measures 2.36:1 contrast against the cream background (needs 4.5:1), in a
53×15px hit area. The de-emphasis intentionally documented in `organizations.md` has been pushed
past an accessibility floor.

### 6. Low — Logout toast has a typo

[Constants.ts:68](../../apps/web/src/statics/Constants.ts):
`LOGOUT_SUCCESS: "Logged out sucessfully !"` — missing a "c", shown to every user on every logout (3
call sites).

### 7. Low — Two navbar links with overlapping names, different destinations

The mobile sheet shows both "Profile" (→ `/dashboard`) and "Your Profile" (→ `/user/:handle`) —
confusingly similar labels for different pages. Not currently cataloged in
[known-issues.md](../specs/known-issues.md).

### 8. Low — Nav never offers "Sign In," only "Sign Up," at any breakpoint

[Navbar.tsx:146,231](../../apps/web/src/components/Navbar.tsx): every logged-out CTA reads "Sign
Up." Functionally fine (the unified flow detects existing emails), but a returning user sees no
"Sign In" anywhere.

### 9. Confirmed still open (already in `known-issues.md`, no new information)

Navbar account-dropdown's "Settings" and "Support" both `href="/"` — reconfirmed present on the
Individual account's mobile menu.

## Prioritized pickup list

Ordered by (impact × how many users hit it) ÷ effort. "Specs to touch" is what needs to change in
the same commit as the fix, per this repo's "docs move with code" rule — not read-only references.

1. **#1 — org signup redirect race.**
   Highest priority: it blocks the entire organization onboarding funnel end to end, and it's the
   entry point for the flow currently being worked on elsewhere in this repo. Fix in
   [useAuth.ts](../../apps/web/src/features/authentication/hooks/useAuth.ts) and/or
   [DonotRenderWhenLoggedIn.tsx](../../apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx).
   *Specs to touch:* [authentication.md](../specs/authentication.md) already describes the intended
   behavior correctly — update its "navigate in the same tick" explanation once the actual
   mechanism is understood, so the comment stops claiming a fix that didn't hold. No content change
   needed to [organizations.md](../specs/organizations.md).

2. **#2 — org profile invisible on first paint.**
   Second priority: same severity class as #1 (a core page effectively doesn't render), and it's the
   page #1's fix sends users straight to. Fix in
   [useSectionReveal.ts](../../apps/web/src/hooks/useSectionReveal.ts) usage, most likely by giving
   [OrganizationProfile.tsx:114](../../apps/web/src/features/organizations/pages/OrganizationProfile.tsx)
   a dependency array keyed on the fetched organization record, matching the pattern
   `Organizations.tsx`/`Events.tsx` already use.
   *Specs to touch:* [organizations.md](../specs/organizations.md) (`OrganizationProfile.tsx`
   section) and the Motion section of [ui-kit.md](../specs/ui-kit.md) — the `useSectionReveal`
   contract should say explicitly that a scope containing async-loaded content needs a dependency
   array, since this is now the second page to hit it.

3. **#4 — avatar keyboard/screen-reader accessibility.**
   Third: a real, total access blocker for keyboard/AT users on mobile, not a polish item, and a
   contained fix (add `role="button"`, `tabIndex={0}`, `aria-label`, a `keydown` handler) in
   [Navbar.tsx](../../apps/web/src/components/Navbar.tsx).
   *Specs to touch:* [layout-navigation.md](../specs/layout-navigation.md) (Navbar section) —
   describe the corrected accessible markup so the next agent doesn't reintroduce a bare `<img>`
   trigger.

4. **#3 — design-token drift (red-500/amber-500 → error/warning tokens).**
   Fourth: wide-reaching but mechanical (swap classes) and lower risk than the above three; do it in
   one pass across the files listed above rather than piecemeal, so the app doesn't end up with a
   third half-migrated color convention.
   *Specs to touch:* none required — [ui-kit.md](../specs/ui-kit.md) already documents
   `--color-error`/`--color-warning` correctly; this fix makes the code match the doc, not the other
   way around. Worth a one-line addition to [known-issues.md](../specs/known-issues.md) beforehand if
   it isn't picked up immediately, so it doesn't get rediscovered from scratch.

5. **#5 — "Maybe later" contrast/touch-target.**
   Fifth: small, isolated fix (bump `text-ink/40` to something closer to `/60`, add padding) in
   [SetupIntro.tsx](../../apps/web/src/features/organizations/components/setup/SetupIntro.tsx).
   *Specs to touch:* [organizations.md](../specs/organizations.md) — its "small, centered
   `text-caption` text link" description should note the specific opacity/size floor once corrected,
   since this is exactly the kind of over-correction the same section already narrates happening
   twice before.

6. **#6 — logout typo.**
   Sixth: one-line, zero-risk fix in [Constants.ts](../../apps/web/src/statics/Constants.ts).
   *Specs to touch:* none.

7. **#7 / #8 — "Profile" vs. "Your Profile" naming, and no "Sign In" label anywhere.**
   Lowest priority of the new findings, and deliberately last: both are product/IA decisions, not
   bugs — per this repo's own rule ("When two implementations exist, ask"), these should go to Tamal
   as a question before anyone renames or restructures nav copy, rather than being picked up
   unilaterally.
   *Specs to touch (once a decision is made):* [layout-navigation.md](../specs/layout-navigation.md)
   and [onboarding-profile.md](../specs/onboarding-profile.md) (the two-profile-pages section).

8. **#9 — Settings/Support dead links.**
   Not new work — already tracked in [known-issues.md](../specs/known-issues.md). Bundle it into
   whichever of the above touches `Navbar.tsx` if convenient, otherwise leave it where it is.
