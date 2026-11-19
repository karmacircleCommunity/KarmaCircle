import type { EventAccess, RegistrationStatus } from "@features/events/types";

/**
 * Who can join an event (PG-4, PG-14). The values are the slugs the API stores
 * (`EVENT_ACCESS_LEVELS` in `apps/api/src/modules/events/event.constants.ts`;
 * keep the two in step); the labels are what people read.
 */
export const EVENT_ACCESS_OPTIONS: readonly {
  value: EventAccess;
  label: string;
  hint: string;
}[] = [
  {
    value: "open",
    label: "Open to everyone",
    hint: "Anyone signed in can join straight away.",
  },
  {
    value: "approval",
    label: "Approval required",
    hint: "Anyone can ask to join, and you approve or decline each person.",
  },
  {
    value: "invite",
    label: "Invite only",
    hint: "Only people you invite by email can join. It still shows in the directory.",
  },
];

/** The label for an access level, as shown on cards, pills and filters. */
export const accessLabel = (access: EventAccess) =>
  EVENT_ACCESS_OPTIONS.find((option) => option.value === access)?.label ??
  "Open to everyone";

/** How a person's own standing reads on My Events and the attendee list. */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  going: "Going",
  pending: "Requested",
  waitlisted: "Waitlisted",
  declined: "Not approved",
};
