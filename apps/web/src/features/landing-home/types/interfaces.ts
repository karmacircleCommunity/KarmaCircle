import type { LandingIcon } from "./types";
import type { User } from "@/types/user";

/**
 * `successCallback()` (`KarmaCircleApi.ts`, `GET /auth/login/success`) returns
 * the raw Axios response on success but the raw caught error object on
 * failure — its own catch block returns `err`, not `err.response` (see
 * SPEC.md). That's why this type carries both a `data.message` shape
 * (success) and a bare top-level `message` (failure, e.g. `"Network Error"`)
 * rather than picking one.
 */
export interface OAuthSuccessResponse {
  status?: number;
  data?: {
    message?: string;
    user?: User;
  };
  message?: string;
}

/**
 * One step of "how a drive actually happens", rendered by `HowItWorks.tsx`.
 * `label` is the printed step number ("01"), not an index — the numbering is
 * content, so it lives with the copy rather than being derived from array
 * position at render time.
 */
export interface DriveStep {
  id: string;
  label: string;
  icon: LandingIcon;
  title: string;
  body: string;
  meta: string;
}

/**
 * A card in the horizontally-scrolled drives rail (`DrivesRail.tsx`).
 *
 * These are illustrative sample drives, not live data — there is no
 * "list public drives" endpoint in `KarmaCircleApi.ts`/`ApiEndpoints.ts` today
 * (see SPEC.md). Amounts are pre-formatted strings, including the currency
 * symbol, because the samples deliberately span countries; `percent` is
 * the single numeric field since it's the one the progress bar animates.
 */
export interface SampleDrive {
  id: string;
  category: string;
  title: string;
  organizer: string;
  location: string;
  summary: string;
  /**
   * Cover photo, imported from `assets/pictures/drives/` so Vite fingerprints
   * it. Placeholder imagery standing in for what an organization would upload
   * with its own drive - the card clamps the title to one line and the summary
   * to two, so a cover is what actually distinguishes one card from the next.
   */
  cover: string;
  /** Describes the photo itself; the drive's own text is already in the card. */
  coverAlt: string;
  raised: string;
  goal: string;
  percent: number;
  supporters: number;
  daysLeft: number;
}

/**
 * One way to pitch in, rendered by `OpenSource.tsx`.
 *
 * Deliberately three short records and nothing more. The section this
 * belongs to replaced a much larger "where the money goes" bento (bars, a
 * receipt, three tiles) that was cut for being too heavy a thing to sit
 * directly above the footer — so if this interface starts growing figures,
 * proportions, or a fourth entry, that is the old section coming back.
 */
export interface ContributeWay {
  id: string;
  icon: LandingIcon;
  title: string;
  body: string;
}
