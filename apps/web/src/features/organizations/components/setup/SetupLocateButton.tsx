import { FiLoader, FiNavigation } from "react-icons/fi";
import type { LocateCity } from "../../hooks/useLocateCity";

/**
 * "Use my current location", in the space beside the question's headline.
 *
 * It sat under the two fields before this, which was the wrong side of the
 * answer: an optional shortcut stacked below the thing it is a shortcut
 * *for* reads as another item to deal with, and the headline row had an
 * empty right half doing nothing. Up here it is offered before the typing
 * starts and stops competing with Continue for the bottom of the screen.
 *
 * "Use my location" rather than "Use my current location": sharing this row
 * with a 32px headline means every word costs a wrap, and "current" was the
 * one carrying no information - there is no other location on offer.
 *
 * A pill rather than a line of text, borrowing the shape the flow already
 * uses for its tag and cause options (white surface, `border-brand-secondary`
 * hairline, brand on hover), so it is recognisably the same product and is
 * visibly pressable. Outline-only, because nothing on this screen should
 * out-shout the primary action.
 */
type SetupLocateButtonProps = {
  locate: LocateCity;
  /** Hidden once there's a city, since the shortcut has nothing left to do. */
  hasCity: boolean;
};

const SetupLocateButton = ({ locate, hasCity }: SetupLocateButtonProps) => {
  // Once a city is in the field the button is answering a question nobody
  // is asking any more, so it goes. It comes back if the field is emptied,
  // and it stays through a press that is still running or that failed -
  // those are the two moments where the next thing someone wants is this
  // button again.
  if (hasCity && !locate.locating && !locate.failure) return null;

  return (
    <button
      type="button"
      onClick={locate.locate}
      disabled={locate.locating}
      data-cy="org-locate"
      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-brand-secondary/20 bg-white px-3.5 py-2 font-outfit text-caption text-ink/70 transition-colors duration-200 hover:border-brand/40 hover:bg-brand/4 hover:text-brand disabled:cursor-wait disabled:border-brand-secondary/10 disabled:bg-white/50 disabled:text-ink/35 motion-safe:active:scale-97 sm:text-body"
    >
      {locate.locating ? (
        <FiLoader aria-hidden className="size-4 motion-safe:animate-spin" />
      ) : (
        <FiNavigation aria-hidden className="size-4" />
      )}
      {locate.locating ? "Finding you…" : "Use my location"}
    </button>
  );
};

export default SetupLocateButton;
