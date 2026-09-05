import { useState } from "react";
import { locateCity } from "@utils/locationSuggest";
import type { LocateFailure, LocateSource } from "@utils/locationSuggest";

/**
 * The "use my current location" shortcut, as state rather than as a widget.
 *
 * It is a hook because the two halves of this control don't live in the
 * same place on screen. The button belongs in the empty space beside the
 * question's headline, where a small optional shortcut reads as a shortcut;
 * whatever it has to say afterwards belongs under the two fields it just
 * filled, where there is room for a sentence and where the fields it is
 * talking about actually are. Sharing one piece of state between those two
 * positions is the whole job, and a hook does it without a portal or a
 * context.
 *
 * See `@utils/locationSuggest` for what `locateCity` actually tries -
 * briefly: the device twice, then the connection, and never after an
 * outright refusal.
 */
export type LocateFilled = { place: string; source: LocateSource };

export interface LocateCity {
  locate: () => Promise<void>;
  /** Drops whatever the last press said. Called when the user takes over. */
  clear: () => void;
  locating: boolean;
  failure: LocateFailure | null;
  filled: LocateFilled | null;
}

export const useLocateCity = (
  setField: (key: "city" | "state", value: string) => void,
): LocateCity => {
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<LocateFailure | null>(null);
  const [filled, setFilled] = useState<LocateFilled | null>(null);

  const clear = () => {
    setFailure(null);
    setFilled(null);
  };

  const locate = async () => {
    setLocating(true);
    clear();

    const result = await locateCity();
    setLocating(false);

    if (typeof result === "string") {
      setFailure(result);
      return;
    }

    setField("city", result.match.city);
    setField("state", result.match.state);
    // Says what it did, because the alternative is silence: when the fields
    // already held this answer, nothing on screen moves and the press reads
    // as having done nothing at all. And it says which of the two answers
    // it got, because a guess from the connection is worth a second look
    // and the device's own fix is not.
    setFilled({
      place: `${result.match.city}, ${result.match.state}`,
      source: result.source,
    });
  };

  return { locate, clear, locating, failure, filled };
};
