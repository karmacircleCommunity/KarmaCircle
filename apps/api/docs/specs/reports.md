# Reports Module

[src/modules/reports/](../../src/modules/reports/) — "report a problem" form submission, rate-limited per email address. Owns the `ReportProblem` model. Mounted at `/user/report` (see [architecture.md](./architecture.md#routing-table) — this module's router is mounted onto the same `/user` base path as the `users` module, in `src/routes/index.ts`, even though the two are otherwise unrelated).

## `report.model.ts`

`model<IReportProblem>("report", ...)`, `{ timestamps: true }`. Fields: `firstName`, `lastName`, `email`, `reportmessage` (note the lowercase, no-camelCase field name — matches the frontend's own field name for this form, so this is an intentional contract match, not a typo to "fix"), all `string` and required. A compound index on `{ email: 1, createdAt: 1 }` backs `hasReportedRecently`'s query below — without it, that lookup is a full collection scan.

## `POST /user/report`

No auth. `validate(createReportSchema)` requires all four fields (`email` must be a valid email format). Flow:

1. `reportService.hasReportedRecently(email)` — queries for any `ReportProblem` from this exact `email` with `createdAt >= now - 2h`. If one exists: `429 { success: false, message: STATUS_MESSAGE.TOO_MANY_REQUESTS }` (note this is a `200`-shaped-looking body but with `429` as the actual HTTP status — matches the frontend's own `response.data.success` check).
2. Otherwise: `reportService.createReport(data)` saves a new document, responds `200 { success: true }`.

The cooldown is **per email, not per IP/session** — nothing stops a caller from reporting once per email address across many different emails in rapid succession; the rate limit here is specifically an anti-spam-per-identity measure, not a general abuse throttle (the global `apiLimiter`/`authLimiter` in [architecture.md](./architecture.md#middleware-stack-createapp-in-order) are the IP-based throttles). There's also no auth requirement tying the report to the currently logged-in user (if any) — `email` is just a free-text field in the body, unverified against any account.

## What's known-broken here

Nothing module-specific found. The frontend's own spec (`api-integration.md`) already documents `ReportProblem()`'s odd success-detection logic (`response.data.success === true` / `response.data.message === "tryagain"` / else `false`) — note this backend **never actually sends `message: "tryagain"`** in any response; that branch in the frontend's client code appears to be dead/speculative on the frontend side, not something this API produces. See [known-issues.md](./known-issues.md#cross-repo-contract-breaks).
