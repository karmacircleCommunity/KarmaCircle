/**
 * The left panel on the setup intro.
 *
 * It holds one line of copy on purpose — everything actionable (the steps,
 * the timing, the CTA) is on the right, and a signed-up organization is
 * past being sold to. What this adds over a bare statement is atmosphere,
 * so the negative space reads as considered rather than unfinished:
 *
 * - a brand **aura** blooming slowly behind the headline, and
 * - an **orbit** motif — one brand dot turning around a faint ring, a
 *   point travelling a circle, the KarmaCircle at panel scale.
 *
 * Both are decorative (`aria-hidden`), sit behind the copy, run slow
 * (18s / 44s) and low-contrast, and are dropped entirely by `motion-safe:`
 * under `prefers-reduced-motion` — the motif then just rests. They are the
 * app's only ambient loops besides `OpenSource.tsx`'s 6px dot; see the
 * motion-token note in `styles/index.css` for why they earn the exception.
 *
 * The whole panel is hidden below 900px by `SplitPanelLayout`, so none of
 * this renders (or animates) on a phone.
 */
const SetupIntroAside = () => (
  <div className="relative">
    <div
      aria-hidden
      className="pointer-events-none absolute -top-40 -left-28 size-[440px] rounded-full bg-brand/30 blur-[130px] motion-safe:animate-aura"
    />

    <div
      aria-hidden
      className="pointer-events-none absolute top-28 -left-56 origin-center text-white motion-safe:animate-orbit"
    >
      <svg width="460" height="460" viewBox="0 0 200 200" fill="none">
        <circle
          cx="100"
          cy="100"
          r="94"
          stroke="currentColor"
          strokeOpacity="0.08"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          stroke="currentColor"
          strokeOpacity="0.06"
        />
        <circle cx="100" cy="6" r="3.5" fill="var(--color-brand)" />
      </svg>
    </div>

    <div className="relative max-w-sm">
      <span aria-hidden className="mb-9 flex items-center gap-2.5">
        <span className="size-1.5 rounded-full bg-brand" />
        <span className="h-px w-12 bg-white/25" />
      </span>

      <p className="leading-1.4 font-poppins text-[28px] font-semibold text-white motion-safe:animate-rise-in sm:text-[32px]">
        People are already looking for what you do.
        <span className="mt-2 block text-white/45">
          A complete profile is how they find you.
        </span>
      </p>
    </div>
  </div>
);

export default SetupIntroAside;
