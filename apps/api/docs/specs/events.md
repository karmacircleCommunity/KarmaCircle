# Events Module

[src/modules/events/](../../src/modules/events/) — list events (all, or one by `uid`) and create an event as the authenticated host. Owns the `Event` model.

## `event.model.ts`

`model<IEvent>("Event", ...)`, `{ timestamps: true }` (adds `createdAt`/`updatedAt` automatically).

| Field | Type | Notes |
|---|---|---|
| `name`, `description` | `string` (required, trimmed) | |
| `uid` | `string` (required, `unique: true`) | The event's slug/identifier — see `createEvent`'s duplicate check below |
| `hostUsername`, `hostName` | `string` (required) | **Set by the server** from the authenticated caller's own `User` record — never accepted from the request body (see below) |
| `coverImage` | `string?` (trimmed) | |
| `mode` | `"Online" \| "Offline"` (required, `enum`) | The only field with a real Mongoose `enum:` constraint in this module |
| `address`, `city`, `state`, `country`, `mapIframe` | `string?` (trimmed) | Conditionally required at the validation layer when `mode === "Offline"` — see below; the *schema* itself doesn't enforce that conditional, only `createEventSchema` does |
| `platform`, `platformLink` | `string?` (trimmed) | Presumably for `Online` events (e.g. "Zoom" + a join link) — not validated as required even when `mode === "Online"`, unlike the offline-required fields |
| `startTime`, `endTime`, `startDate`, `endDate` | `Date` (all required) | Four separate date/time fields rather than two combined datetimes — see the frontend's own event-creation spec for how its date/time pickers populate these |

## `event.service.ts`

- **`findByUid(uid)`** / **`findAll()`** — thin wrappers, no projection (unlike `users`, nothing here strips fields — an `Event` document has no secret fields to hide, so this is fine as-is).
- **`createEvent(email, data)`** — `409 EVENT_UID_ALREADY_EXISTS` if `data.uid` is already taken (a plain existence check, not relying on the schema's own `unique: true` to surface a friendlier error — same race-condition caveat as `users`' `generateUniqueUsername`: two concurrent requests with the same `uid` could both pass this check before either saves, in which case the second `.save()` would hit the schema's unique index and surface as the error handler's generic Mongo-11000 → `409` path instead of this specific message). Looks up the host via `findByEmail(email)` (from `requireAuth`'s `req.auth.email`) — `401 UNAUTHORIZED` if that somehow fails (same "token valid but account gone" edge case as [organizations.md](./organizations.md#get-organizationsdashboard)). Builds the `Event` as `{ ...data, hostName: host.name, hostUsername: host.userName }` — **`hostName`/`hostUsername` in the request body, if sent, are silently overwritten** by the authenticated caller's own values; there's no way to create an event on someone else's behalf through this endpoint, which is presumably intentional.

## `GET /events`

No auth. `validate(listEventsQuerySchema, "query")` — `{ uid?: string, slug?: string, page?: number, limit?: number }` (pagination merged in from [src/utils/pagination.ts](../../src/utils/pagination.ts), default `page=1`/`limit=20`, capped at 100), and the controller reads **either** `uid`/`slug` (`const eventUid = uid ?? slug`, `uid` wins if both are present). If either is set: `findByUid` → `404 NOT_FOUND` if none, single event object (`page`/`limit` accepted but ignored on this branch). Otherwise: every event as `{ data, pagination }` — `eventService.findAll({ skip, limit })` runs the `find` and a `countDocuments` in parallel. The `slug` alias exists because the frontend's `eventEndpoints`/route naming uses "slug" in some places and "uid" in others for what is the same field on this side — see [api-contract.md](./api-contract.md#get-events) before assuming which query param name a given frontend call site actually sends.

## `POST /events/create`

`requireAuth` → `validate(createEventSchema)` → `eventController.createEvent`. Required always: `uid`, `name`, `description`, `coverImage`, `mode`, `startTime`, `endTime`, `startDate`, `endDate` (the four dates go through `z.coerce.date()`, so ISO strings or anything `Date`-constructible are accepted, not just already-`Date` values). Required **only if `mode === "Offline"`** (`createEventSchema`'s `superRefine`): `city`, `state`, `country`, `address`, `mapIframe` — each missing one adds its own Zod issue at that field's path, so a partially-filled offline event gets one `400` response listing every missing field at once, not just the first. `platform`/`platformLink` are always optional regardless of mode, even though they're the fields an `Online` event would actually need to be useful — nothing in this validation schema requires an online event to specify how to join it. On success: `201 { message: "Event Created", savedEvent }` — note this response's top-level shape (`message` + `savedEvent`, not `message` + `user`/`event`) is unique to this route; every other module's create/success response in this API uses a different key name for the payload (compare `users`' `user`, `products`' bare object).

## What's known-broken here

See [known-issues.md](./known-issues.md#events). The main cross-repo item: the frontend has **two** competing "create event" UI components per its own spec, and only one of them is known (by the frontend's own docs) to send a body shape compatible with this route — check which component a given frontend change actually touches before assuming `POST /events/create`'s contract is being exercised correctly. Within this module alone, the `Online`-mode fields (`platform`/`platformLink`) not being required is the one asymmetry worth a second look if online events start showing up without a join link.
