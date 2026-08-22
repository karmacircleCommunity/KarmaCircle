import type { UserType } from "@/types/user";

/**
 * A club/org record as rendered by `ClubCard.jsx`.
 * Per `clubs/SPEC.md`, the real shape returned by `GET /clubs` is
 * unverified from this repo (no backend code lives here) — this type
 * covers exactly the fields the hardcoded fixture in `Clubs.jsx` and
 * `ClubCard.jsx` actually read today, plus an open index signature so a
 * real backend response with extra fields doesn't need a type change to
 * pass through. Tighten this once the backend's `/clubs` response is
 * confirmed.
 */
export interface Club {
  _id: string;
  userType: UserType;
  userName: string;
  name: string;
  email?: string;
  cart?: unknown[];
  description?: string;
  __v?: number;
  [key: string]: unknown;
}

export interface ClubCardProps {
  club?: Club;
}
