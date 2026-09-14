# 02 — Color

## The palette in one block

Copy this when you need the whole palette as literals.

```css
--color-brand:            #a8623e;
--color-brand-hover:      #8f5236;
--color-brand-secondary:  #382c24;
--color-surface:          #fffcf7;
--color-surface-warm:     #faf4ec;
--color-surface-muted:    #f5f7f7;
--color-surface-hover:    #f5f7fd;
--color-surface-dark:     #0e0906;
--color-ink:              #212529;
--color-heading:          #28183b;
--color-border-subtle:    #f0efef;
--color-border-muted:     #e0e0e0;
--color-input-border:     #ced4da;
--color-success:          #2e6b4a;
--color-error:            #a8402f;
--color-warning:          #8a5a12;
--color-info:             #3a6a8a;
```

## Contrast contract

Every token intended to carry white text was checked at WCAG AA (>= 4.5:1) before being added:
`--color-brand`, `--color-success`, `--color-error`, `--color-warning`, `--color-info`.
`--color-brand-secondary` was checked as **text on the `#fffcf7` body ground**, not as a background.
If you add a color token, hold it to the same bar and record which direction you checked.

## Complete hex inventory

Counts are literal `#rrggbb` occurrences across `apps/web/src/**/*.{ts,tsx,css}`.
"Legal" means it is the canonical way to express that value; "drift" means an equivalent token exists and should have been used.

### Tokenized, declared once in `index.css`

`#a8623e`, `#8f5236`, `#382c24`, `#fffcf7`, `#faf4ec`, `#f5f7f7`, `#f5f7fd`, `#0e0906`, `#212529`, `#28183b`, `#f0efef`, `#e0e0e0`, `#ced4da`, `#2e6b4a`, `#a8402f`, `#8a5a12`, `#3a6a8a`.

Two of these also appear a second time outside the token block:

| Hex | Second location | Status |
| --- | --- | --- |
| `#a8623e` | `features/organizations/constants/organizationDisplay.ts:26` (accent gradient `from`) | Legal. It is data, not styling: the first entry of the `ORGANIZATION_ACCENTS` gradient table. |
| `#0e0906` | tokenized; no stray literal remains | Legal. |
| `#fffcf7` | tokenized; components use `bg-surface` | Legal. |

### Data palette — organization accent gradients

[features/organizations/constants/organizationDisplay.ts:25-30](../../../apps/web/src/features/organizations/constants/organizationDisplay.ts#L25).
Six `{ from, to, ink }` triples, used as a fallback band behind a monogram (organizations) or a calendar mark (events) when a record has no cover photo.
This is content data keyed by `organization.accent % 6`, not a design token, and is correctly a literal.

| # | from | to | ink |
| --- | --- | --- | --- |
| 0 | `#a8623e` | `#d8a17c` | `#7d4527` |
| 1 | `#8a6b3d` | `#d9c08a` | `#6a5029` |
| 2 | `#7d5a4f` | `#c9a596` | `#5e4038` |
| 3 | `#96603f` | `#e0b48e` | `#70452b` |
| 4 | `#6f6a45` | `#c2bd8f` | `#535030` |
| 5 | `#9c5450` | `#dda49c` | `#763a37` |

Rendered as `linear-gradient(135deg, ${from}, ${to})` ([OrganizationCard.tsx:67](../../../apps/web/src/features/organizations/components/OrganizationCard.tsx#L67)).

### One-off literals still in components

| Hex | File:line | Verdict |
| --- | --- | --- |
| `#faf8f5` | [SplitPanelLayout.tsx:95](../../../apps/web/src/components/layouts/SplitPanelLayout.tsx#L95) | **Tokenize on next touch.** The focused-flow form surface, a soft cream chosen because pure white next to 15px body text read as glare. It is a distinct role from `--color-surface` (`#fffcf7`) and deserves its own token, e.g. `--color-surface-form`. |
| `#4a11030e` | [TrackSection.tsx:18](../../../apps/web/src/features/dashboard/components/TrackSection.tsx#L18) | Drift. An 8-digit hex, i.e. a near-transparent maroon tint. Replace with `bg-brand/5`. |
| `#e1e2e7` | [CreateEvent.tsx:358,391](../../../apps/web/src/features/events/components/CreateEvent.tsx#L358) | Drift. Near `--color-border-muted` (`#e0e0e0`). Use `border-border-muted`. |
| `#646a79` | [CreateEvent.tsx:369,402](../../../apps/web/src/features/events/components/CreateEvent.tsx#L369) | Drift. A mid gray for helper text. Use `text-gray-500` or `text-ink/60`. |
| `#e8e8e8` | [CreateEvent.tsx:358,391](../../../apps/web/src/features/events/components/CreateEvent.tsx#L358) | Drift, inside a `shadow-[0px_3px_5px_0px_#e8e8e8]`. |
| `#e2e5e883` | [Navbar.tsx:265,300](../../../apps/web/src/components/Navbar.tsx#L265) | Drift. The account-dropdown separator hairline. Use `bg-black/5`. |
| `#e26959` | [styles/App.css:2](../../../apps/web/src/styles/App.css#L2) | **Stale.** The pre-rebrand saturated orange, in the `::selection` rule. It exists nowhere else in the palette. |
| `#ff5b31` | `apps/web/index.html` (`theme-color` and three vendor variants) | **Stale.** Pre-rebrand orange in the browser/PWA chrome color. |
| `#fbfbfb`, `#28183b` | `features/onboarding-profile/pages/UserProfile.css` | Legacy page CSS. `#28183b` duplicates `--color-heading`. |
| `#2e8e83`, `#000000` | `features/donate-shop-trending/pages/Donate.css` | Legacy page CSS. `#2e8e83` (teal) is in no palette. |
| `#000000` | [Button.tsx:70](../../../apps/web/src/components/buttons/Button.tsx#L70) | The `ClipLoader` spinner color prop. A JS prop, not a class, so it cannot be a utility; acceptable, but `var(--color-brand-secondary)` would be better. |
| `#ffffff` | `index.css` toastify override (`--toastify-toast-background`), autofill `-webkit-box-shadow` | Legal. |
| `#000000` variants (`#000000eb`, `#0000`, `#000`) | `index.css` `.custom-checkbox`, `.loader` | Legal within hand-written global CSS. |

### Raw `rgba()` brand literals

`rgba(168,98,62,0.5)` and `rgba(168,98,62,0.55)` are `#a8623e` at 50% and 55%.
They appear **13 times** across the primary-CTA shadow recipe.
They are frozen: a retheme of `--color-brand` will not move them.
The rethemeable form is `color-mix(in srgb, var(--color-brand) 55%, transparent)`, which is what the card hover already uses.
See [14-drift-register.md](./14-drift-register.md#d1).

`rgba(56,44,36,0.45)` in [Combobox.tsx:209](../../../apps/web/src/components/inputs/Combobox.tsx#L209) is `#382c24` at 45%, i.e. `--color-brand-secondary`. Same issue, one occurrence.

### Tailwind default-palette colors in use

These are legal when they are an exact or near-exact match for a neutral and no token exists.

| Class | Count | Hex |
| --- | --- | --- |
| `text-gray-500` | 19 | `#6b7280` |
| `text-gray-800` | 9 | `#1f2937` |
| `text-gray-600` | 9 | `#4b5563` |
| `text-gray-400` | 6 | `#9ca3af` |
| `border-gray-300` | 6 | `#d1d5db` |
| `bg-gray-50` | 5 | `#f9fafb` |
| `border-gray-200` | 4 | `#e5e7eb` |
| `bg-gray-200` | 2 | `#e5e7eb` |
| `text-gray-700` | 1 | `#374151` |
| `border-gray-400` | 1 | `#9ca3af` |
| `bg-gray-100` | 1 | `#f3f4f6` |

**Illegal default-palette colors currently present:** `text-red-600` (36 occurrences) and the `amber-500`/`amber-700` badge (1 occurrence).
Both have tokens (`error`, `warning`). See [14-drift-register.md](./14-drift-register.md#d2).

## Alpha conventions actually in use

| Expression | Meaning | Typical use |
| --- | --- | --- |
| `text-ink/70` | body copy, softened | card summaries |
| `text-ink/65` | nav links at rest | `Navbar` |
| `text-ink/55` | meta rows, inactive filters | cards, `DirectoryToolbar` |
| `text-ink/45`, `/40`, `/35`, `/25` | counts, placeholders, icons, separators | `DirectoryToolbar`, `Combobox` |
| `text-white/90 /70 /65 /60 /55 /50 /40 /35` | the full dark-panel and footer text ramp | `Footer`, `SplitPanelLayout`, `AuthLayout` |
| `border-brand-secondary/8` | the card border | all three cards |
| `border-brand-secondary/15` | field underline at rest, `Combobox` panel border | `DirectoryToolbar`, `Combobox` |
| `border-brand/55`, `/35`, `/20` | focus, hover, eyebrow borders | toolbar, cards, eyebrow |
| `bg-brand/10`, `/8`, `/5` | brand tint fills | badges, hover rows, eyebrow |
| `bg-white/10`, `/5` | icon chips and inputs on dark | `AuthLayout`, `Footer` |
| `border-white/15`, `/10`, `/5` | dividers on dark | `Footer` |
| `bg-black/80` | modal scrim | `Modal` |
| `bg-black/[0.867]` | mobile nav scrim | `Navbar` |
| `bg-white/92` | event date badge over a photo | `EventCard` |
| `from-black/55` | photo scrim under a label | `OrganizationCard`, `EventCard` |

## Semantic color usage rules

- Status color reaches the UI in exactly two ways: the four `--color-*` tokens, and the `--toastify-*` overrides that map onto them.
- For a tinted status background use the opacity modifier on the same token (`bg-error/10 text-error`). Do not add a separate tint token.
- The required-field asterisk is `text-error` at `text-xs`, `aria-hidden`, `align-top`, `ml-0.5` ([AuthFieldKit.tsx:12](../../../apps/web/src/features/authentication/components/AuthFieldKit.tsx#L12), [SetupFieldLabel.tsx:26](../../../apps/web/src/features/organizations/components/setup/SetupFieldLabel.tsx#L26)).
- `--color-warning` and `--color-info` have no API-triggered call site yet; the helpers exist so a future need does not reintroduce react-toastify's stock palette.
