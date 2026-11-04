/**
 * Event page addresses that cannot be used. Each one either clashes with a
 * real `/events/<word>` route (`mine`) or is a word a future route is likely
 * to claim. The API enforces the same list; keep this the only copy in the
 * browser (API copy: `apps/api/src/modules/events/event.constants.ts`).
 */
export const RESERVED_EVENT_ADDRESSES: readonly string[] = [
  "mine",
  "new",
  "create",
  "edit",
  "admin",
  "api",
];
