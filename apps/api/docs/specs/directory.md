# Directory Module

[src/modules/directory/](../../src/modules/directory/) — the smallest module in the codebase: two unauthenticated, unfiltered "list everything" endpoints. Owns no model; both routes delegate straight to `users.service` (see [users.md](./users.md#the-user-model-is-shared-by-five-modules)).

## `GET /display/users`

No auth. `validate(listDirectoryQuerySchema, "query")` — just `{ page?: number, limit?: number }` (the shared `paginationQuerySchema`, [src/utils/pagination.ts](../../src/utils/pagination.ts); default `page=1`/`limit=20`, capped at 100 — this route didn't have any validation middleware before pagination was added). `userService.findAll({ skip, limit })` — **every** `User` document regardless of `userType` (individuals and organizations both), returned as `{ data, pagination }`, projected through `PUBLIC_FIELDS` (`-password -__v`).

## `GET /display/organizations`

Same validation/response shape, but `userService.findByType("organization", { skip, limit })` — every organization-type user only. This is the same service call [organizations.md](./organizations.md)'s unfiltered `GET /organizations` branch makes, so the two paginate identically.

## Relationship to `GET /organizations` and `GET /user`

This module's two routes are near-duplicates of the unfiltered branches of [users.md](./users.md)'s `GET /user` (no `userName` → all individuals) and [organizations.md](./organizations.md)'s `GET /organizations` (no `userName` → all organizations) — the only real difference is `directory`'s `GET /display/users` returns **everyone** (both types), which neither `users` nor `organizations` alone does. If you're asked to add filtering, sorting, or pagination to "list all users/organizations," check whether the request means this module, the unfiltered branch of `organizations`/`users`, or all three — they currently return overlapping-but-not-identical data and any future pagination/filtering change should probably land in all of them together rather than one silently drifting from the others.

## What's known-broken here

Nothing module-specific. Both routes are paginated (see above); see [known-issues.md](./known-issues.md) for cross-cutting items.
