# 14 — Drift register

Deviations from this design system that exist in the code **right now**.
Each entry is actionable: file, line, what is wrong, what it should be.

When you fix one, delete its entry in the same commit.
When you find a new one, add it here rather than leaving it undocumented.

Status key: **OPEN** (still in the code) / **FIXED** (corrected, kept for one cycle as a record).

---

## D1 — Brand hex frozen inside shadows — OPEN

`rgba(168,98,62,0.5)` and `rgba(168,98,62,0.55)` are `--color-brand` at 50% and 55%, written as literals.
13 occurrences across the primary-CTA recipe: `features/authentication/pages/Auth.tsx` (lines 127, 226, 249, 354, 450, 511), `ForgotPassword.tsx:74`, `Error404.tsx:154`, and their neighbours.
`rgba(56,44,36,0.45)` in [components/inputs/Combobox.tsx:209](../../../apps/web/src/components/inputs/Combobox.tsx#L209) is `--color-brand-secondary` at 45%.

A retheme of `--color-brand` will not move any of them.

**Fix:** `color-mix(in srgb, var(--color-brand) 50%, transparent)`.
The card hover and the toast shadow already use this form; copy them.

---

## D2 — Raw status colors still in four files — OPEN

The September 2026 migration onto `text-error` / `text-warning` covered auth and the setup wizard. It did not cover:

| File | `text-red-600` count |
| --- | --- |
| `features/onboarding-profile/components/ProfileUpdate.tsx` | 9 |
| `features/onboarding-profile/components/ProfileCompletion.tsx` | 8 |
| `features/events/components/CreateEvent.tsx` | 11 |
| `features/events/components/CreateEvents.tsx` | 8 |

Plus one amber badge: [features/organizations/components/OrganizationSetupGate.tsx:101](../../../apps/web/src/features/organizations/components/OrganizationSetupGate.tsx#L101) uses `border-amber-500/30 bg-amber-500/10 text-amber-700`.

**Fix:** `text-error`; and `border-warning/30 bg-warning/10 text-warning` for the badge.

---

## D3 — Mulish is declared but not loaded — OPEN

`body { font-family: "Mulish", -apple-system, … }` in [styles/index.css](../../../apps/web/src/styles/index.css), but no `<link>` or `@font-face` for Mulish exists in `index.html`.
The only fetch is an `@import` inside [features/donate-shop-trending/pages/Donate.css:1](../../../apps/web/src/features/donate-shop-trending/pages/Donate.css#L1), imported by `Donate.tsx` alone.

On every route except `/donate`, the base font silently resolves to `-apple-system` / `BlinkMacSystemFont` / `Segoe UI` / `Roboto`.

**Decide, then fix:** either load Mulish properly in `index.html`, or drop it from the `body` stack so the declared base font is the one that actually renders.
Do not leave it ambiguous.

---

## D4 — Two Google Font faces loaded and never used — OPEN

[apps/web/index.html](../../../apps/web/index.html) loads **Ubuntu (400)** and **Open Sans (400)**.
Neither has a `--font-*` token and neither appears in any `className`.
Two render-blocking stylesheet requests for nothing.

**Fix:** delete both `<link>` tags.

---

## D5 — `Modal`'s close button is an empty Bootstrap class — OPEN

[components/Modal.tsx:17](../../../apps/web/src/components/Modal.tsx#L17) renders `className="btn-close ..."` with **no children**.
`btn-close` is a Bootstrap utility that drew the glyph as a background image, and Bootstrap has been removed entirely.
The button is therefore an invisible, empty click target with `aria-label="Close"`.

**Fix:** render an icon (`RxCross2` at `size-4`, matching the Navbar sheet's close control) and drop `btn-close`.

Same component, two further gaps: `max-[525px]:text-center` contradicts the mobile left-alignment rule, and there is no `role="dialog"`, `aria-modal`, focus trap or Escape handler.

---

## D6 — Browser and PWA chrome colors are not the brand — OPEN

| Location | Value | Should be |
| --- | --- | --- |
| `index.html` `theme-color` | `#ff5b31` | a brand-palette value |
| `index.html` `msapplication-navbutton-color` | `#ff5b31` | same |
| `index.html` `msapplication-TileColor` | `#ff5b31` | same |
| `index.html` `apple-mobile-web-app-status-bar-style` | `#ff5b31` | this attribute only accepts `default` / `black` / `black-translucent`; a hex is invalid |
| `manifest.json` `theme_color` | `#000000` | same as `theme-color` |
| `manifest.json` `background_color` | `#ffffff` | `#fffcf7` (`--color-surface`) |

`#ff5b31` is the pre-rebrand saturated orange and exists nowhere in the palette.

**Needs a decision before fixing:** the chrome bar can be either the page ground (`#fffcf7`) or the accent (`#a8623e`). They are different products visually. Pick one and apply it to every row above.

---

## D7 — Broken icon references in `index.html` — OPEN

- `<link rel="apple-touch-icon" href="/logo192.png">` — **`public/logo192.png` does not exist.**
- `<link rel="shortcut icon" href="./src/assets/pictures/solidarity.png">` — a source-tree path in a static tag; it will not resolve in the production build.

`og:image` / `twitter:image` hotlink `raw.githubusercontent.com` and point at an **SVG**, which social-card scrapers do not reliably render.

---

## D8 — One-off hexes that should be tokens or existing utilities — OPEN

| Hex | File:line | Fix |
| --- | --- | --- |
| `#faf8f5` | [SplitPanelLayout.tsx:95](../../../apps/web/src/components/layouts/SplitPanelLayout.tsx#L95) | Add `--color-surface-form` |
| `#4a11030e` | [TrackSection.tsx:18](../../../apps/web/src/features/dashboard/components/TrackSection.tsx#L18) | `bg-brand/5` |
| `#e1e2e7` | `CreateEvent.tsx:358,391` | `border-border-muted` |
| `#646a79` | `CreateEvent.tsx:369,402` | `text-gray-500` |
| `#e8e8e8` | `CreateEvent.tsx:358,391` (inside a shadow) | a token-based shadow |
| `#e2e5e883` | `Navbar.tsx:265,300` | `bg-black/5` |
| `#000000` | [Button.tsx:70](../../../apps/web/src/components/buttons/Button.tsx#L70) (`ClipLoader color`) | `var(--color-brand-secondary)` |
| `text-[15px]` (10 uses) | various | `text-body` — it is the same 15px |
| `#e2695900` | `styles/index.css:266,279` | The pre-rebrand orange at zero alpha, in the scrollbar rules. Fully transparent so it renders nothing, but it is the last ghost of `#e26959` in the codebase. Use `transparent` |

---

## D9 — `Header.tsx` is legacy — OPEN

[components/header/Header.tsx](../../../apps/web/src/components/header/Header.tsx):

- Sole consumer of `font-mont`, the app's third face.
- Reads `window.innerWidth < 800` **once at render, with no resize listener**, so it never re-evaluates.
- Uses `clsx` to wrap three static strings.
- `max-500px:break-all` will break words mid-character.
- Uses px letter-spacing (`tracking-[1.2px]`, `tracking-[1px]`) rather than `em`.

**Fix:** rebuild on the section-heading recipe in [10-patterns.md](./10-patterns.md), and retire `--font-mont` once `Profile.tsx`'s use is also gone.

---

## D10 — `BacktoTop` is not keyboard reachable — OPEN

[components/buttons/BacktoTop.tsx:56](../../../apps/web/src/components/buttons/BacktoTop.tsx#L56) is a `<div onClick>` with no `role`, no `aria-label` and no `tabIndex`.

**Fix:** make it a `<button type="button" aria-label="Back to top">`.

---

## D11 — Two `.css` files remain inside features — OPEN

`features/onboarding-profile/pages/UserProfile.css` and `features/donate-shop-trending/pages/Donate.css` predate the Tailwind migration.
`UserProfile.css` duplicates `--color-heading` (`#28183b`) three times; `Donate.css` introduces a teal (`#2e8e83`) that is in no palette.

---

## D12 — Legacy arbitrary breakpoints — OPEN

`max-[540px]:` (20), `max-[991px]:` (14), `max-[525px]:` (11), `max-[767px]:` (2) each exist in exactly one component family and duplicate a nearby standard tier.
Consolidate onto `sm:` / `lg:` and the three `@custom-variant` tiers when touching those files.

---

## D13 — The `karmacircle-brand` repo is a manual copy — OPEN, structural

`brand.karmacircle.org` (repo `karmacircleCommunity/karmacircle-brand`, its own `src/index.css`) duplicates this app's tokens by hand.
Nothing enforces the two staying identical.

**Every token change in this repo must be mirrored there manually**, or the published design system starts describing a product that no longer exists.

Note the mirror is **not** total — see D14 for the two places the brand repo now deliberately diverges, and why copying them back here would be wrong.

---

## D14 — The brand site has tokens this app doesn't, and one it must not copy back — OPEN

September 2026: `brand.karmacircle.org` fixed a dark-mode contrast failure of its own. The fix introduced two tokens that have **no equivalent here**, plus one value that deliberately differs. Recorded so the next person syncing the two repos (D13) doesn't flatten the difference in the wrong direction.

### Do not copy back: the brand site's dark ground

This app **has no dark mode** — no `prefers-color-scheme` block, no `data-theme`, nothing.
`--color-surface-dark: #0e0906` ([styles/index.css](../../../apps/web/src/styles/index.css)) is a *full-bleed dark panel on a light page*: [components/footer/Footer.tsx:122](../../../apps/web/src/components/footer/Footer.tsx#L122), [components/layouts/SplitPanelLayout.tsx:71](../../../apps/web/src/components/layouts/SplitPanelLayout.tsx#L71), `OpenSource.tsx:117`, `OrganizationProfile.tsx:460`.

The brand site *does* have a light/dark toggle, and its dark page ground is now `#12100c` — lifted off `#0e0906` because body text on that near-black measured **15.6:1** and halated (13.76:1 after).

Those two values look like the same token drifting. They are not: one is a panel, one is a page ground. **Copying `#12100c` into this repo would change the footer and auth panel for a reason that doesn't apply to them.** Leave `--color-surface-dark` at `#0e0906`.

### Missing here: `--on-brand`

`--color-brand` is dark in light mode (`#a8623e`) and would be a light tint in any dark mode (`#ce8863` on the brand site). White text on a brand fill is therefore only safe in light mode:

| text on brand fill | ratio | |
| --- | --- | --- |
| `#fff` on `#a8623e` (light) | 4.69:1 | passes AA |
| `#fff` on `#ce8863` (dark) | **2.87:1** | fails |
| `#fff` on `#e0996f` (dark, hover) | **2.34:1** | fails worse — hover gets *brighter* |
| `#251a12` on `#ce8863` (dark) | 5.93:1 | the fix |

This app is safe **today only because it has no dark mode**. The trap is live the moment one is added: this file's own `@theme` comment says the status tokens were "checked against WCAG AA (>=4.5:1) for white text on the token" — that assumption silently breaks in dark mode.

**Fix, if/when dark mode lands:** add `--color-on-brand` (`#fff` light / `#251a12` dark) and use it for anything sitting on a brand fill. Never hardcode `#fff` there. The brand repo's `--on-brand` is the reference implementation.

### Missing here: `--border-strong`

The brand site's outline button borrowed the heading color for its border, which on a dark ground is a near-white hairline at **16.99:1** — glare, not definition. It now has `--border-strong` (`#8a7c6e` in dark = 4.70:1).

No equivalent is needed here while the app stays light-only; `--color-border-muted` covers it. Same caveat as above: revisit with dark mode.

---

## FIXED in the commit that created this directory

### F1 — `leading-<decimal>` classes generated no CSS

`leading-1.05` (3 uses in `Landing.tsx`), `leading-1.1` (`DrivesRail.tsx:291`, `HowItWorks.tsx:87`) and `leading-1.12` (`OpenSource.tsx:152`) are not on Tailwind v4's numeric grid and produced **no rule at all** (confirmed absent from the built `dist/assets/index-*.css`, while `leading-4.5` and `leading-10.75` are present).
Those five headings silently rendered at the font's normal line-height instead of the intended tight ratio.
Rewritten to the bracket form `leading-[1.05]` / `leading-[1.1]` / `leading-[1.12]`.

Note the repo's `eslint-plugin-tailwindcss` `no-unnecessary-arbitrary-value` rule (v3-era, set to `warn`) will ask for the bare form back. **Ignore it for `leading` and `tracking`.**

### F2 — `::selection` used the pre-rebrand orange

[styles/App.css](../../../apps/web/src/styles/App.css) set `background: #e26959`, a color that exists nowhere else in the palette after the August 2026 rebrand.
Now `var(--color-brand)`, so text selection follows a retheme.
