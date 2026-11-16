import type { EventType } from "@features/events/types";

/**
 * What kind of event it is (PG-9). The values are the slugs the API stores
 * (`EVENT_TYPES` in `apps/api/src/modules/events/event.constants.ts`; keep the
 * two in step); the labels are what people read. "Hackathon" is deliberately
 * not here: whether hackathons are an event type on KarmaCircle is still an
 * open decision (PG-27).
 */
export const EVENT_TYPE_OPTIONS: readonly {
  value: EventType;
  label: string;
}[] = [
  { value: "volunteering", label: "Volunteering drive" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "workshop", label: "Workshop or training" },
  { value: "awareness", label: "Awareness campaign" },
  { value: "meetup", label: "Meetup or networking" },
  { value: "cultural", label: "Cultural or community event" },
  { value: "other", label: "Other" },
];

/** The label for a stored type, or `undefined` for an event with none. */
export const eventTypeLabel = (type: EventType | undefined) =>
  EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label;

export const EVENT_TAGS_MAX_ITEMS = 8;
export const EVENT_TAG_MAX_LENGTH = 30;
