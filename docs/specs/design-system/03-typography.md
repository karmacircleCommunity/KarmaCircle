# 03 — Typography

## Faces and how they load

Loaded via `<link>` in [apps/web/index.html](../../../apps/web/index.html), preconnected to `fonts.googleapis.com` and `fonts.gstatic.com`, all `display=swap`.

| Face | Weights requested | Token | Status |
| --- | --- | --- | --- |
| Outfit | 300;400;500;600;700;800;900 | `--font-outfit` | **Primary.** 223 uses. |
| Poppins | 400;500;600;700;800 | `--font-poppins` | **Secondary.** 144 uses. |
| Montserrat | 400;500;600;700;800;900 | `--font-mont` | Minor. 5 uses, all in `Header.tsx`. |
| Ubuntu | 400 | none | **Loaded, never used.** Dead render-blocking request. |
| Open Sans | 400 | none | **Loaded, never used.** Dead render-blocking request. |
| Mulish | not loaded here | none | Declared first in `body { font-family }` but only fetched by `features/donate-shop-trending/pages/Donate.css`, which is imported by `Donate.tsx` alone. On every other route the body stack falls through to `-apple-system` / `BlinkMacSystemFont` / `Segoe UI` / `Roboto`. |

See [14-drift-register.md](./14-drift-register.md#d3) and [#d4](./14-drift-register.md#d4).

## Role assignment

This is the rule. Match it rather than introducing a fourth face.

| Role | Face | Why |
| --- | --- | --- |
| Headings, nav, buttons, labels, badges, eyebrows, card titles, stat values, anything that is not a paragraph | `font-outfit` | The default for everything that is not body copy. |
| Body copy, form helper text, card summaries, meta rows, footer link text, footer legal | `font-poppins` | |
| Nothing new | `font-mont` | Only `Header.tsx` (`text-[3.5rem]` `font-black` `uppercase` hero) and `Profile.tsx` still use it. Do not add a sixth use. |
| Document base | `"Mulish"` stack in `body` | Almost always overridden at component level by the two tokens above. |

## Size ramp

`--text-*` tokens emit **font-size only**, with no line-height.
Tailwind's own `text-*` scale emits both.
This asymmetry matters: a `text-body` paragraph that wraps needs an explicit `leading-*`, a `text-sm` one does not.

| Utility | font-size | line-height emitted | Uses | Typical role |
| --- | --- | --- | --- | --- |
| `text-caption` | **10px** | none | 66 | Uppercase eyebrows, meta rows, stat labels, footer headings, legal line |
| `text-xs` | 12px / 0.75rem | 16px | 13 | Required asterisk, footer links at mobile |
| `text-[13px]` | 13px | none | 3 | One-off small text |
| `text-sm` | 14px / 0.875rem | 20px | 56 | Dense secondary text, wordmark in `SplitPanelLayout` |
| `text-body` | **15px** | none | 169 | The default body size. Card summaries, form labels, combobox rows |
| `text-base` | 16px / 1rem | 24px | 19 | Navbar CTA, dropdown rows |
| `text-body-lg` | **17px** | none | 85 | Nav links, card titles at mobile, search input, lead paragraphs |
| `text-lg` | 18px / 1.125rem | 28px | 16 | Card titles from `sm` up, footer wordmark |
| `text-xl` | 20px / 1.25rem | 28px | 25 | Navbar wordmark, footer wordmark at `sm` |
| `text-2xl` | 24px / 1.5rem | 32px | 16 | Footer "Stay connected." at mobile |
| `text-3xl` | 30px / 1.875rem | 36px | 4 | Auth panel heading, footer heading at `sm` |
| `text-[2rem]` | 32px | none | 13 | Section heading at mobile |
| `text-4xl` | 36px / 2.25rem | 40px | 14 | Section heading from `sm` up; card monogram fallback |
| `text-[2.7rem]` | 43.2px | none | 3 | Landing hero at `max-500px` |
| `text-[45px]` | 45px | none | 1 | `Header` hero at `max-500px` |
| `text-[2.75rem]` | 44px | none | 1 | `DrivesRail` heading at `lg` |
| `text-5xl` | 48px / 1 | 48px | 1 | `HowItWorks` heading at `lg` |
| `text-[3.5rem]` | 56px | none | 1 | `Header` hero |
| `text-6xl` | 60px / 1 | 60px | 3 | Landing hero |
| `text-[120px]` | 120px | none | 1 | Decorative numeral |

Other arbitrary sizes present, all single-use, all candidates for the nearest token: `text-[15px]` (10 uses, **is** `text-body` — replace), `text-[26px]`, `text-[27px]`, `text-[32px]`, `text-[23px]`, `text-[22px]`, `text-[14px]`, `text-[1.75rem]`, `text-[2.1rem]`, `text-[1.4rem]`, `text-[1.8rem]`, `text-[1.2rem]`, `text-[0.9rem]`.

## Weights

| Utility | Value | Uses |
| --- | --- | --- |
| `font-normal` | 400 | 47 |
| `font-medium` | 500 | 75 |
| `font-semibold` | 600 | 75 |
| `font-bold` | 700 | 27 |
| `font-extrabold` | 800 | 4 |
| `font-black` | 900 | 1 (`Header.tsx`) |

Convention: section and card headings are `font-semibold`; labels, eyebrows and active filters are `font-medium`; nav links and body are `font-normal`.
`font-bold` and above are reserved for hero-scale type.

## Line height

| Utility | Computed | Uses | Role |
| --- | --- | --- | --- |
| `leading-none` | 1 | 22 | Single-line UI text: wordmark, nav links, dropdown rows, buttons |
| `leading-tight` | 1.25 | 22 | Multi-line headings and card titles |
| `leading-snug` | 1.375 | 2 | |
| `leading-normal` | 1.5 | 5 | |
| `leading-relaxed` | 1.625 | 3 | Long-form paragraphs |
| `leading-5` | **20px** | 4 | Spacing-scale step |
| `leading-6` | **24px** | 25 | The standard body paragraph leading at 15px |
| `leading-7` | **28px** | 21 | Body paragraph at 17px, i.e. `sm:text-body-lg sm:leading-7` |
| `leading-8` | **32px** | 2 | |
| `leading-4.5` | **18px** | 2 | `CreateEvent` helper text at 14px |
| `leading-10.75` | **43px** | 1 | `Header` hero at `max-500px` |
| `leading-[1.375rem]` | 22px | 3 | The card `line-clamp-2` summary |

### `leading-<decimal>` is a trap

In Tailwind v4 a bare number after `leading-` is resolved against the **spacing scale**, not as a unitless ratio.
`leading-4.5` is `calc(var(--spacing) * 4.5)` = 18px, which is intended and correct.
`leading-1.05` would mean 4.2px, which is not what anyone writing it intends.

Worse: Tailwind only generates the utility for values on its numeric grid.
`leading-1.05`, `leading-1.1` and `leading-1.12` **generate no CSS at all** (verified absent from `dist/assets/index-*.css`, while `leading-4.5` and `leading-10.75` are present).
An element carrying one of them silently falls back to the font's normal line-height.

**Rule:** for a unitless ratio always write the bracket form, `leading-[1.05]`.
For a real spacing step the bare form is correct, `leading-6`.

The repo's `eslint-plugin-tailwindcss` `no-unnecessary-arbitrary-value` rule is a v3-era plugin set to `warn`, and it will tell you to rewrite `leading-[1.05]` into `leading-1.05`.
**Ignore it for `leading` and `tracking`.** The arbitrary form is the correct one.

## Letter spacing

| Utility | Computed | Uses | Role |
| --- | --- | --- | --- |
| `tracking-tight` | -0.025em | 37 | Headings, wordmark, card titles |
| `tracking-wide` | 0.025em | 19 | Uppercase meta and stat labels at `text-caption` |
| `tracking-widest` | 0.1em | 7 | Uppercase labels riding on a photo (card cause label, event date badge) |
| `tracking-[0.16em]` | 0.16em | 8 | **The eyebrow.** The single most standardized value in the app |
| `tracking-[0.14em]` | 0.14em | 4 | |
| `tracking-[0.12em]` | 0.12em | 3 | Footer column headings |
| `tracking-[0.08em]` | 0.08em | 1 | |
| `tracking-[0.2px]`, `[0.4px]`, `[1px]`, `[1.2px]` | px | 4 | Legacy `Header.tsx` and neighbours. Prefer `em`. |

Rule: uppercase small text always carries positive tracking; large headings always carry `tracking-tight`; 15px/17px body carries none.

## Canonical type recipes

Eyebrow (8 near-identical uses; this is the reference form):

```
inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5
px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase
```

Section heading:

```
mt-6 max-w-xl font-outfit text-[2rem] font-semibold tracking-tight text-brand-secondary
leading-[1.1] sm:text-4xl lg:text-[2.75rem]
```

Section lead paragraph:

```
mt-5 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7
```

Card title:

```
font-outfit text-body-lg leading-tight font-semibold tracking-tight text-brand-secondary sm:text-lg
```

Card summary, fixed two-line box:

```
mt-2 line-clamp-2 min-h-11 font-poppins text-body leading-[1.375rem] text-ink/70
```

Meta row:

```
font-poppins text-caption tracking-wide text-ink/55
```

Form label:

```
mb-1.5 font-outfit text-body font-medium text-gray-800
```

`SetupFieldLabel` uses `text-ink/70` instead of `text-gray-800` for the same role; the two should converge on `text-ink/70`.
