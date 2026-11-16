/**
 * Event page addresses (`uid`) that must never be taken by an event.
 * Each one either clashes with a real `/events/<word>` route today (`mine`)
 * or is a word a future route is likely to claim. Keep this the only
 * API-side list; the browser keeps its own copy in
 * `apps/web/src/features/events/constants/reservedEventAddresses.ts`.
 */
export const RESERVED_EVENT_UIDS: readonly string[] = [
  "mine",
  "new",
  "create",
  "edit",
  "admin",
  "api",
];

/** Mirrors the browser create form (`useEvent.ts` and its `maxLength` props). */
export const EVENT_NAME_MIN_LENGTH = 10;
export const EVENT_NAME_MAX_LENGTH = 80;
export const EVENT_DESCRIPTION_MIN_LENGTH = 20;
export const EVENT_DESCRIPTION_MAX_LENGTH = 200;

/** Upper bounds for the free-text fields the browser does not cap. */
export const EVENT_CITY_MAX_LENGTH = 100;
export const EVENT_STATE_MAX_LENGTH = 100;
export const EVENT_COUNTRY_MAX_LENGTH = 100;
export const EVENT_ADDRESS_MAX_LENGTH = 200;
export const EVENT_PLATFORM_MAX_LENGTH = 60;
export const EVENT_PLATFORM_LINK_MAX_LENGTH = 2048;

/** Cover image: an https link, or a base64 data URL of one of these types. */
export const COVER_IMAGE_MIME_TYPES = ["png", "jpeg", "webp", "gif"] as const;
/** Same 5 MB ceiling the browser applies to the chosen file (decoded bytes). */
export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_IMAGE_URL_MAX_LENGTH = 2048;

/**
 * What kind of event it is (PG-9). Slugs are stored and sent over the API; the
 * web maps them to labels. `hackathon` is deliberately absent: whether
 * hackathons are an event type here is still an open decision (PG-27).
 */
export const EVENT_TYPES = [
  "volunteering",
  "fundraiser",
  "workshop",
  "awareness",
  "meetup",
  "cultural",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Longest IANA timezone name accepted (the longest real one is under 40). */
export const EVENT_TIMEZONE_MAX_LENGTH = 64;

/** Free-text tags on an event (PG-9). */
export const EVENT_TAGS_MAX_ITEMS = 8;
export const EVENT_TAG_MAX_LENGTH = 30;

/** Limits for the optional detail fields an organizer can fill in (PG-7). */
export const EVENT_ABOUT_MAX_PARAGRAPHS = 20;
export const EVENT_ABOUT_PARAGRAPH_MAX_LENGTH = 4000;
export const EVENT_BRING_ALONG_MAX_ITEMS = 20;
export const EVENT_BRING_ALONG_ITEM_MAX_LENGTH = 100;
export const EVENT_LANGUAGES_MAX_ITEMS = 10;
export const EVENT_LANGUAGE_MAX_LENGTH = 40;
export const EVENT_AGENDA_MAX_ITEMS = 30;
export const EVENT_AGENDA_TIME_MAX_LENGTH = 30;
export const EVENT_AGENDA_TITLE_MAX_LENGTH = 100;
export const EVENT_AGENDA_DETAIL_MAX_LENGTH = 200;
export const EVENT_GETTING_THERE_MAX_LENGTH = 500;
export const EVENT_JOIN_NOTE_MAX_LENGTH = 300;
export const EVENT_CONTACT_EMAIL_MAX_LENGTH = 254;
export const EVENT_COST_MAX_AMOUNT = 10_000_000;
export const EVENT_COST_NOTE_MAX_LENGTH = 200;
export const EVENT_MINIMUM_AGE_MAX = 120;

/** Largest `capacity` an organizer can set (PG-5). */
export const EVENT_CAPACITY_MAX = 100_000;

/** Longest `search` text the directory list accepts. */
export const EVENT_SEARCH_MAX_LENGTH = 100;
