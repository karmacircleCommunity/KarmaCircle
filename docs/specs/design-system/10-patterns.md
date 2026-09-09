# 10 — Canonical patterns

Copy-paste recipes. Each is the form already used in the codebase; using anything else creates drift.

---

## Page shell

```jsx
<div className="mx-auto max-w-6xl px-9 py-12 sm:px-10 lg:px-12 lg:py-16">
```

Wide grids use `max-w-7xl`, prose uses `max-w-3xl`, single-column forms use `max-w-2xl`.
Never omit `mx-auto` + a `max-w-*`; that is what covers 4K/5K.

---

## Landing section

```jsx
<section
  aria-labelledby="x-heading"
  className="relative border-y border-brand-secondary/8 bg-surface-warm py-16 sm:py-24 lg:py-28"
>
  <div className="mx-auto max-w-6xl px-9 lg:px-12">
    {/* eyebrow, heading, lead, content */}
  </div>
</section>
```

Use `bg-surface-warm` for a banded section, never `bg-surface-muted`; the cool gray reads as a different site next to the warm cream ground.

---

## Eyebrow

```jsx
<span
  data-reveal
  className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase"
>
  The circle, in motion
</span>
```

On a dark surface, swap the three brand values for `border-white/15 bg-white/5 text-white/70`.
For a warning state, swap for `border-warning/30 bg-warning/10 text-warning`.
`inline-block` instead of `inline-flex` when there is no leading icon or dot.

---

## Section heading and lead

```jsx
<h2
  id="x-heading"
  data-reveal
  className="mt-6 max-w-xl font-outfit text-[2rem] leading-[1.1] font-semibold tracking-tight text-brand-secondary sm:text-4xl lg:text-[2.75rem]"
>
  Blankets in Kolkata. Books in Kajiado. <span className="text-brand">One feed.</span>
</h2>
<p
  data-reveal
  className="mt-5 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7"
>
  …
</p>
```

Emphasis inside a heading is `<span className="text-brand">`, never a weight change.
`leading-[1.1]` in brackets, never `leading-1.1`. See [03-typography.md](./03-typography.md#leading-is-a-trap).

---

## Primary CTA, form context

```jsx
<Button
  type="submit"
  isLoading={submitting}
  onClickfunction={handleSubmit}
  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-poppins text-body font-semibold shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_50%,transparent)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-6px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] sm:w-auto"
>
  Continue
</Button>
```

The 13 existing call sites write `rgba(168,98,62,0.5)` and `text-[15px]` instead.
`color-mix` and `text-body` are the correct forms; use them in new code and migrate existing sites when you touch them.

---

## Secondary / compact CTA (nav, chips)

```jsx
<Button
  to="/auth/signup"
  className="flex w-auto items-center justify-around gap-2.5 rounded-5px border-none px-5 py-2 font-outfit text-base font-normal transition-all duration-300 ease-in-out motion-safe:hover:-translate-y-0.5"
>
  <span>Sign Up</span>
</Button>
```

---

## Form field

```jsx
<label htmlFor="email" className="mb-1.5 font-outfit text-body font-medium text-ink/70">
  Email <RequiredMark />
</label>
<input id="email" className={inputClasses} />
{errors.email && <p className="mt-1.5 font-poppins text-caption text-error">{errors.email}</p>}
```

`inputClasses` from [AuthFieldKit.tsx](../../../apps/web/src/features/authentication/components/AuthFieldKit.tsx).
**A non-empty `errors` object must actually block the API call.**
Several existing forms compute errors and call the API anyway; do not copy that.

---

## Card

Use `OrganizationCard` or `EventCard`.
If a genuinely new record type needs a card, copy the shared skeleton in [09-components-feature.md](./09-components-feature.md#one-card-three-surfaces) exactly and add only what that record needs.
Do not invent a fourth card design.

---

## Directory page

```jsx
<DirectoryToolbar
  query={query} onQueryChange={setQuery}
  searchPlaceholder="Search events" searchLabel="Search events"
  options={CAUSES} active={cause} onSelect={setCause}
  filterLabel="Filter by cause"
  summary={`${results.length} events in ${cause}`}
  action={<Button to="/organization/events" className="...">Your dashboard</Button>}
/>
```

Then scope `useSectionReveal` to the grid, keyed on `[results.length, cause]`.

---

## Focused flow (no navbar, no footer)

```jsx
<SplitPanelLayout
  align="start"
  aside={<YourAside />}
  asideDecor={<YourDecor />}
  contentClassName="max-w-md"
>
  {form}
</SplitPanelLayout>
```

`align="start"` for anything tall enough to scroll, `"center"` for a short form.
A hollow aesthetic panel wants depth behind the words, not more words.

---

## Status pill

```jsx
<p className="m-0 rounded-full bg-brand/10 px-2.5 py-1 font-poppins text-caption tracking-wide text-brand">
  {n} spots left
</p>
```

Neutral/exhausted state: `bg-brand-secondary/8 text-ink/50`.
Semantic states: `bg-success/10 text-success`, `bg-error/10 text-error`, `bg-warning/10 text-warning`.

---

## Photo scrim + label

```jsx
<div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
<span className="absolute bottom-2.5 left-4 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm">
  {label}
</span>
```

Any text sitting on a photograph gets a scrim. No exceptions.

---

## Divider

Inside a panel: `<div role="separator" aria-orientation="horizontal" className="h-px w-full bg-black/5" />`.
Between sections: `border-t border-border-subtle` on light, `border-t border-white/10` on dark.
Mobile-only grouping divider: `border-t border-white/5 pt-8 lg:border-none lg:pt-0`.

---

## Horizontal scroller on mobile

```
-mx-9 flex gap-6 overflow-x-auto px-9 pb-1
sm:mx-0 sm:flex-wrap sm:px-0
[&::-webkit-scrollbar]:hidden
```

The negative margin must equal the page's mobile padding.

---

## Scroll reveal

```jsx
const scope = useRef(null);
useSectionReveal(scope, [results.length, cause]);   // deps required if data is async
return <div ref={scope}>{items.map(i => <Card data-reveal key={i.id} … />)}</div>;
```

---

## Anti-patterns

| Do not | Instead |
| --- | --- |
| `<Button>Save</Button>` with no `className` | Pass a shape |
| `onClick={fn}` on `Button` | `onClickfunction={fn}` |
| `toast.success(msg)` | `showSuccessToast(msg)` |
| `status === 200` | `status === STATUSCODE.OK` |
| `text-red-600` | `text-error` |
| `bg-[#a8623e]` / `rgba(168,98,62,…)` | `bg-brand` / `color-mix(…)` |
| `leading-1.05` | `leading-[1.05]` |
| A new `useGSAP` block for an entrance | `useSectionReveal` + `data-reveal` |
| `hover:-translate-*` on a `useMagnetic` element | Express it in color |
| A raw `<button onClick>` styled to look like the app | `Button` |
| New `@tanstack/react-query` usage | `useSWR(endpoint, fetcher)` from `@utils/Fetcher` |
| A new backend call in a feature `services/` file | `services/KarmaCircleApi.ts` |
| `.container` in new code | `mx-auto max-w-6xl px-9 sm:px-10 lg:px-12` |
| A new `.scss` or CSS Module | Tailwind utilities |
| A fourth font face | `font-outfit` or `font-poppins` |
| A fourth card design | The shared card skeleton |
| Fabricated stats or testimonials | Real data, or no claim |
