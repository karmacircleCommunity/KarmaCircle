# 09 — Feature-level reusable components

These live under `src/features/<name>/components/` but are reusable design surfaces, not one-off page internals.

---

## One card, three surfaces

`DrivesRail`'s drive card (landing), `OrganizationCard` and `EventCard` are **deliberately the same design**.
They were rebuilt this way in August 2026, replacing three unrelated designs.
Read this section before reusing any of them as a template for a fourth.

The shared skeleton:

```
group flex h-full flex-col overflow-hidden rounded-2xl
border border-brand-secondary/8 bg-white
shadow-[0_2px_18px_-14px_var(--color-brand-secondary)]
transition-[transform,box-shadow,border-color] duration-300 ease-out
hover:border-brand/35
hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]
motion-safe:hover:-translate-y-1
```

1. **Cover**: `relative aspect-16/9 shrink-0 overflow-hidden bg-brand-secondary/10`, image `size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105`, `loading="lazy" decoding="async"`.
2. **Scrim**: `absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent`, `aria-hidden`.
3. **Label riding on the photo**: `absolute bottom-2.5 left-4 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm`.
4. **Body**: `flex flex-1 flex-col p-4 sm:p-5`.
5. **Title**, one line, `truncate`: `font-outfit text-body-lg leading-tight font-semibold tracking-tight text-brand-secondary sm:text-lg`.
6. **Summary**, two lines on a fixed box so every card in a row is the same height whatever the copy does: `mt-2 line-clamp-2 min-h-11 font-poppins text-body leading-[1.375rem] text-ink/70`. `min-h-11` = **44px**.
7. **Bottom rule**: `mt-auto ... border-t border-border-subtle pt-3.5 font-outfit`.

Each adds only what its own record needs.
Both carry `data-reveal`, inert unless an ancestor scopes `useSectionReveal` (their two index pages do).

---

## `OrganizationCard`

[features/organizations/components/OrganizationCard.tsx](../../../apps/web/src/features/organizations/components/OrganizationCard.tsx).

**The whole card is one `<Link>`**, not a card with an arrow button inside it.
A 300px target beats a 32px one, and it removes the old markup's nested-interactive smell.
`aria-label` is `"{name} — {cause} in {city}"`.
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`.

Additions over the shared skeleton:

- **No-cover fallback**: an accent band, `linear-gradient(135deg, from, to)` from `ORGANIZATION_ACCENTS[accent % 6]`, with the monogram at `font-outfit text-4xl font-semibold text-white/90`. Not one shared stock banner, which is what made the old grid read as twenty copies of one record.
- **Featured badge** (September 2026): `featured` prop only — a small uppercase pill (`bg-white/95 text-brand`) top-right on the cover, for `Organizations.tsx`'s featured strip. Never set for any other reason.
- **Verified tick**: `MdVerified` at `size-4 shrink-0 text-brand`, `role="img"`, `aria-label="Verified organization"`.
- **Arrow**: `FiArrowUpRight`, `ml-auto size-5 shrink-0 text-brand-secondary/35 ... group-hover:text-brand motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5`. Decorative, `aria-hidden`.
- `min-w-0` on the title is what lets it truncate instead of pushing the tick and arrow out of the card.
- **Meta row**: `mt-2.5 flex items-center gap-1.5 font-poppins text-caption tracking-wide text-ink/55` with `FiMapPin` at `size-3.5`, and `Since {founded}`. The separator (September 2026) is a drawn `size-1 rounded-full bg-ink/25` dot, not a `•` character — a text bullet's vertical position varies by font/renderer and read noticeably high against the pin icon and the digits either side of it under close zoom; a fixed-size circle centers identically everywhere.
- **Stat row**: `mt-auto grid grid-cols-3 gap-2 border-t border-border-subtle pt-3.5 font-outfit`. `<dt>`/`<dd>` both carry `truncate` (September 2026) so a longer label ("Focus areas") can't wrap to two lines while its neighbours stay on one, which used to throw the row's baseline off between columns. `<dt>` `font-poppins text-caption tracking-wide text-ink/50 uppercase`, `<dd>` `m-0 mt-0.5 text-body font-semibold text-brand-secondary`. Three stats: Followers, Team, Focus areas.

The monogram was removed from the cover when real per-organization photos landed; over a photo it read as clutter, and it survives on the profile header where a profile picture belongs.

---

## `EventCard`

[features/events/components/EventCard.tsx](../../../apps/web/src/features/events/components/EventCard.tsx).

Root is an `<article>`, not a link, because the card contains **two** destinations.
The card-wide target is a **stretched overlay on the title link** (`after:absolute after:inset-0 after:content-['']`), not an `<a>` wrapped around everything.
That keeps one accessible name for the destination and leaves the organizer link, which points somewhere else entirely, clickable on top of it via `relative z-1`.

Additions over the shared skeleton:

- **Date badge**, top-left on the photo so it costs no vertical space: `absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-outfit text-caption font-semibold tracking-widest text-brand-secondary uppercase backdrop-blur-sm`.
- **Organizer link**: `relative z-1 mt-1 block w-fit max-w-full truncate font-poppins text-caption tracking-wide text-ink/55 uppercase hover:text-brand`.
- **Meta stack**: `mt-2.5 mb-4 flex flex-col gap-1.5 font-poppins text-caption tracking-wide text-ink/55`. `FiCalendar` + weekday/time; `FiVideo` + `Online · {platform}` or `FiMapPin` + `{city}, {country}`. Icons `size-3.5 shrink-0`.
  The explicit `mb-4` is load-bearing: on a card whose copy fills the box, the `mt-auto` below resolves to zero and the rule would sit directly on the location line.
- **Bottom rule**: `mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3.5 font-outfit`. Left `m-0 text-body font-semibold text-brand-secondary` reading `{going} going`. Right a pill, `m-0 rounded-full px-2.5 py-1 font-poppins text-caption tracking-wide`, either `bg-brand/10 text-brand` with `{spotsLeft} spots left`, or `bg-brand-secondary/8 text-ink/50` reading **"Full"**. "Full" rather than "0 spots left"; a zero reads as a data bug.

**The date is split in two on purpose**: the cover badge carries the day ("12 SEP"), the meta row carries only weekday and time ("Sat · 9:00 pm").
Both used to print the full date, so every card said "12" twice.

Historical note: the component it replaced **declared no props at all**. Every field was hardcoded, so all twenty cards in the grid were byte-for-byte identical while `Events.tsx` passed each one an `event` prop it ignored.

---

## `EventsMarqueeCards`

[features/events/components/EventsMarqueeCards.tsx](../../../apps/web/src/features/events/components/EventsMarqueeCards.tsx).
Shares the standardized card hover. See [events.md](../events.md).

`EventSlider`, `FeaturedEventCard` and `FeaturedEventImage` were deleted in the August 2026 events-directory rewrite. Do not reintroduce them.

---

## `AuthFieldKit`

[features/authentication/components/AuthFieldKit.tsx](../../../apps/web/src/features/authentication/components/AuthFieldKit.tsx).
Small shared bits every auth-flow field uses (`Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`), kept in one place so the three pages' inputs cannot drift apart.

`inputClasses`, verbatim:

```
w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5
font-outfit text-body text-ink transition
placeholder:text-[14px] placeholder:text-gray-500
focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/15 focus:outline-none
disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500
```

8px radius, 14px / 10px padding, 15px text, 14px placeholder, a 2px focus ring at 15% brand.

`RequiredMark`:

```
<span className="ml-0.5 align-top text-xs text-error" aria-hidden="true">*</span>
```

Purely a visual cue next to the label. It is **not** tied to HTML's `required` attribute; each form owns its own `errors` state and submit gate.

`--auth-accent` and `--auth-accent-hover` are set on the layout root by `AuthLayout` and now simply point at `var(--color-brand)` / `var(--color-brand-hover)`.
They remain local variables only because `Auth.tsx` reads `--auth-accent` throughout, not because the color differs from the rest of the app anymore.

---

## `AuthLayout`

[features/authentication/components/AuthLayout.tsx](../../../apps/web/src/features/authentication/components/AuthLayout.tsx).
Thin wrapper over `SplitPanelLayout`.
It owns exactly two things: the value props in the left panel, and the accent variables.
**Do not fork the shell into per-step copies; extend here.**

Aside geometry:
- `h2`: `font-poppins text-3xl leading-tight font-bold text-white`.
- Lead: `mt-3 font-outfit text-body text-white/70`.
- List: `mt-10 flex list-none flex-col gap-6 p-0`; item `flex items-start gap-3.5`.
- Icon chip: `flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white`, icon `text-lg`.
- Item title: `font-outfit text-body-lg font-semibold text-white`.
- Item body: `mt-0.5 font-outfit text-body text-white/65`.

Three props, icons `FiUsers` / `FiCalendar` / `FiAward`.

**No numbers or stats here, on purpose.**
This app does not have real usage data to back a claim like "10,000+ organizations", and the codebase already has a documented problem elsewhere (`Landing.tsx`) with fabricated stats standing in for real ones.
Do not add fabricated social proof.

---

## Setup kit

[features/organizations/components/setup/](../../../apps/web/src/features/organizations/components/setup/): `SetupAside`, `SetupFieldLabel`, `SetupIntro`, `SetupLayout`, `SetupLocateButton`, `SetupLocationFields`, `SetupQuestion`.

### `SetupFieldLabel`

```
<label htmlFor={...} className="font-outfit text-body font-medium text-ink/70">
  {children}{required && <span className="ml-0.5 align-top text-xs text-error">*</span>}
</label>
```

Its own file because two things render it (the generic group branch of `SetupQuestion` and the hand-built location pair next door) and the required marker is exactly the sort of detail that drifts the moment it exists twice.
`htmlFor` rather than a wrapping `<label>`: the location fields put a listbox of buttons next to their input, and buttons nested inside a label are a click target arguing with itself.

Note it uses `text-ink/70` while the auth forms use `text-gray-800` for the same role. The two should converge on `text-ink/70`.

### `SetupAside`

The left panel's rotating quote, backed by `constants/setupAsideQuotes.ts`.
The **same quote panel on the intro and on every question screen**, so the flow reads as one design.
Entrance is `motion-safe:animate-rise-in`.

The quotes are real and attributed but are **not testimonials**: monogram, not portrait, and no implied endorsement, per the anti-fabrication rule.

### `SetupLayout`

Wires `SplitPanelLayout` with `aside={<SetupAside />}` and `asideDecor` carrying the `aura` and `orbit` motifs, and switches `align` by stage (`center` on the intro, `start` once questions begin).
