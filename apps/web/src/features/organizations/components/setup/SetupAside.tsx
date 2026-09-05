import { useState } from "react";
import { pickSetupAsideQuote } from "../../constants/setupAsideQuotes";

/**
 * The setup flow's left panel — the same on the intro and on every question
 * screen, so the two stages read as one flow.
 *
 * It is a single rotating quote (see `constants/setupAsideQuotes.ts`): an
 * oversized brand quotation mark set behind the line as a watermark, the
 * line itself, then a monogram + name + role beneath it. A fresh quote is
 * picked on every mount, so a refresh gives a new one; it is held in state
 * so re-renders during the flow don't reshuffle it. The atmosphere behind
 * it (the slow aura and orbit) is the panel's `asideDecor`, wired in
 * `SetupLayout.tsx` — it lives at panel scope so it can sit in the corners
 * without colliding with this copy.
 *
 * There is deliberately no step counter here: wayfinding lives entirely in
 * the right-hand progress bar ("What your organization does · 2 of 8"), and
 * a second, differently-phrased count on the left ("Step 1 of 2") only made
 * the two disagree. The panel carries mood, not state.
 *
 * The whole panel is hidden below 900px by `SplitPanelLayout`.
 */
const SetupAside = () => {
  const [{ quote, author, role, initials }] = useState(pickSetupAsideQuote);

  return (
    <figure className="relative m-0 max-w-sm motion-safe:animate-rise-in">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-3 font-poppins text-[120px] leading-none font-semibold text-brand/20 select-none"
      >
        &ldquo;
      </span>

      <blockquote className="relative font-poppins text-[23px] leading-relaxed font-medium text-white sm:text-[26px]">
        {quote}
      </blockquote>

      <figcaption className="mt-10 flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 font-outfit text-caption font-semibold tracking-wide text-brand"
        >
          {initials}
        </span>
        <span className="font-outfit text-body leading-snug text-white/75">
          {author}
          <span className="mt-0.5 block text-caption text-white/45">
            {role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
};

export default SetupAside;
