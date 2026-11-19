import type {
  ApiRegistration,
  DisplayEvent,
  JoinView,
} from "@features/events/types";

/**
 * What the signed-in person can do about joining one event right now (PG-4,
 * PG-14), from the event's access level, its spots, and the person's own
 * standing. Both join controls (`EventJoinPanel`, `EventMobileActionBar`) read
 * the result, so they can never disagree.
 *
 * The rules mirror `joinEvent` in the API's `event.service.ts`:
 *
 * - a person who is going, waiting or declined keeps that standing, unless an
 *   invitation exists: an invitation settles it and lets them join on any
 *   access level, past the capacity;
 * - without a standing or an invitation, an invite-only event offers nothing;
 * - a full event offers the waitlist, or just says it is full when the
 *   organizer turned the waitlist off;
 * - otherwise the button joins (open) or asks to join (approval).
 */
export function joinView(
  event: Pick<DisplayEvent, "access" | "spotsLeft" | "waitlistEnabled">,
  registration: Pick<ApiRegistration, "status" | "invited"> | undefined,
): JoinView {
  const status = registration?.status ?? "none";
  const invited = registration?.invited ?? false;

  if (status === "going") return { kind: "going" };

  if (invited) {
    return {
      kind: "join",
      label: "Accept invitation",
      shortLabel: "Accept",
    };
  }

  if (status === "pending") return { kind: "pending" };
  if (status === "waitlisted") return { kind: "waitlisted" };
  if (status === "declined") return { kind: "declined" };

  if (event.access === "invite") return { kind: "invite-only" };

  if (event.spotsLeft === 0) {
    return event.waitlistEnabled
      ? {
          kind: "join",
          label: "Join the waitlist",
          shortLabel: "Waitlist",
        }
      : { kind: "full" };
  }

  return event.access === "approval"
    ? { kind: "join", label: "Request to join", shortLabel: "Request" }
    : { kind: "join", label: "Join this event", shortLabel: "Join event" };
}

/** The label of the "leave" link for a person who holds a standing. */
export function leaveLabel(
  kind: JoinView["kind"],
  cancelled: boolean,
): string | undefined {
  if (kind === "going") {
    return cancelled ? "Remove my registration" : "Leave event";
  }
  if (kind === "pending") return "Withdraw my request";
  if (kind === "waitlisted") return "Leave the waitlist";
  return undefined;
}
