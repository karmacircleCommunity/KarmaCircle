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

/** Longest `search` text the directory list accepts. */
export const EVENT_SEARCH_MAX_LENGTH = 100;
