# Organizations to-do list

Owner: Tamal.
Created: 2026-11-16, from a gap review of the organizations module against other platforms, plus a review of the backend stack.
This file is the single source for what is left to do on organizations, and for the backend stack decisions that came out of the same review.
The events module has its own list in [events-to-do-list.md](./events-to-do-list.md).
Several backend items there (security, database, operations) apply to the whole API, and this file points to them instead of copying them.

## How an agent should use this file

When Tamal asks about the "organizations to-do list", read the sections out loud in the order below.
Use plain language, not jargon.
For each section say how many items are open and then read each open item as: what is wrong, why it matters, and what the fix is.
Do not skip a section because it is empty; say it is empty.
When an item is finished, tick it, move it to the "Done" section at the bottom, and update the specs in the same change.
Do not delete items.
Mark an item superseded and say what replaced it.

Item format: `ID`, then the title, then status, then the details.
Status is `open`, `needs decision`, or `done`.
Priority is P1 (fix first), P2 (soon), P3 (later).

Sections:

1. Trust and verification
2. Profile content
3. Team and access
4. Community and engagement
5. Money and transparency
6. Discovery, search engines and analytics
7. Code health
8. Backend stack and architecture
9. Considered and not recommended
10. Decisions needed from Tamal
11. Done

## Why this module comes first

KarmaCircle is a personal project that Tamal shows to other people, with the backend and frontend stack explained alongside it.
The organization is what donors, volunteers and reviewers judge first, and trust is the hard problem for a platform that connects people with NGOs.
Depth in this module (verification, transparency, team roles) is what makes the project read as a real product and not a directory.

Platforms compared: GlobalGiving, Candid (GuideStar), Idealist, Benevity and LinkedIn Pages.
Their descriptions come from their own help pages and marketing, so confirm a detail before copying it.

## 1. Trust and verification

### OG-1 No way to verify an organization
Status: open. Priority: P1.
The `verified` flag exists on the organization record, and the API deliberately blocks organizations from setting it.
No admin route, screen or script sets it, so no organization can ever be verified today.
Fix: add an admin-only route and a small review screen, record who approved and when, and show the badge only when approved.
Idealist reviews each new profile within two business days, and Benevity checks tax records and sanctions lists.

### OG-2 No registration number or legal documents are collected
Status: open. Priority: P1.
An organization goes live by filling description, type, a focus area, team size and city.
Nothing proves it is a real registered organization.
Fix: collect the registration number and registering authority, and optionally supporting documents, as part of a verification request.
Keep this separate from going live, so a profile can be public and unverified.
GlobalGiving reviews legal documents, financial records, program materials and board lists.

### OG-3 No review queue, re-verification or monitoring
Status: open. Priority: P2.
Verification, once it exists (OG-1), should not last forever.
Fix: add a queue of pending requests, a verified-until date, a reminder before it expires, and a way to suspend a profile.
GlobalGiving re-vets every two years and requires project updates at least every three months.
Candid's seal expires after two years without an update.
Benevity pauses payouts to an organization that falls out of compliance.

### OG-4 No verification tiers or badges
Status: open. Priority: P3.
Verified is a yes or no.
Candid has Bronze, Silver, Gold and Platinum seals tied to how much an organization shares.
Fix: decide whether to keep one badge or add levels, for example identity checked, documents checked, financials shared.

### OG-5 Directory ranking uses a switch the organization sets itself
Status: open. Priority: P1.
`GET /organizations` sorts organizations with support enabled first, then verified ones, then newest.
Any organization can turn support on for itself, so "Featured" can be self-assigned.
The frontend builds its "Featured organizations" strip from that order.
Fix: rank on verified status first, then real activity such as recent events or recent verified support, and stop treating the support switch as a ranking signal.
Update the organizations specs on both sides in the same change.

### OG-6 No way to report a profile
Status: open. Priority: P2.
A visitor cannot flag a suspicious or wrong organization page.
The report form (`POST /user/report`) is a general "report a problem" form, not tied to a profile.
Fix: add a "Report this organization" action that records the organization handle, and a way for an admin to act on it.

## 2. Profile content

### OG-7 Logo, cover and gallery are pasted links, not uploads
Status: open. Priority: P2.
`logo`, `cover`, `gallery` and leader photos are plain URL strings, and no upload endpoint exists.
This is already planned as P2 in [organization-editing-plan.md](./specs/organization-editing-plan.md).
Fix: choose object storage, add owner-only upload and removal endpoints with type and size rules, and keep images optional.
This is the same storage work as DB-1 in the events list, so do both with one storage decision.

### OG-8 No programs, projects or impact numbers
Status: open. Priority: P2.
A profile has a description, tag, focus areas and a few facts.
It cannot show what the organization actually does or what it achieved.
Candid's seal levels are built on programs and goals and metrics, and GlobalGiving is built around projects.
Fix: add a programs section (title, summary, status) and a small impact section (a few labeled numbers with a year), both optional.

### OG-9 No annual report or financial documents
Status: open. Priority: P3.
`fundsRaised` is a stated figure, labeled as stated on the page.
There is nowhere to publish an annual report or audited financials.
Fix: allow a few document links or uploads with a year and a type, and mark documents as verified only when an admin has checked them.
Depends on OG-7 for storage and OG-1 for a reviewer.

### OG-10 Missing facts on a profile
Status: open. Priority: P3.
Not stored today: founded year, registration details shown publicly, languages served, a video, testimonials.
Fix: add the ones that help a visitor decide, and keep each optional.

### OG-11 Check what the live editor still lacks
Status: open. Priority: P2.
The editing plan, written 27 October 2026, says the live editor did not yet include map embed, leadership, fundraising details, the support switch and image fields.
The API accepts leadership, social links, map embed and the support switch, and the public profile shows them.
Later work may have added some of these to the editor.
Fix: read the editor code first, then list exactly what is still missing, and update the plan to match.

## 3. Team and access

### OG-12 One owner only, no roles, invites or history
Status: open. Priority: P2.
Only the owner login can edit the organization.
The `members` array on the record is pre-wired and nothing uses it.
LinkedIn Pages have super admin, content admin and analyst roles.
Fix: design invites and roles (owner, editor, analyst), keep an audit history of who changed what, and let events use the same roles (PG-17 in the events list).

### OG-13 Handle change, unpublish, ownership transfer and account deletion
Status: needs decision. Priority: P3.
The handle cannot be changed, and a live organization cannot be unpublished.
The draft to live change is one-way on purpose, so a half-edited profile does not vanish and break links.
Ownership cannot move to another person, and an organization cannot delete itself.
Fix: decide each one on its own.
A handle change needs redirects from the old handle.
Unpublish needs a visible state for followers and for events already published.

## 4. Community and engagement

### OG-14 Organizations cannot post updates
Status: open. Priority: P2.
Visitors can follow an organization, but the organization has nothing to say to them.
GlobalGiving requires a project update at least every three months, and LinkedIn Pages are built around posts.
Fix: add a short updates feed on the profile (text, optional image, date), owner-only to write, public to read.

### OG-15 Followers get no notifications
Status: open. Priority: P2.
Following has no payoff today.
Fix: notify followers when the organization publishes an event or an update, with an easy way to turn it off.
This builds on the reminder and notification work in PG-18 of the events list.

### OG-16 No "contact this organization" form
Status: open. Priority: P3.
A visitor sees a public email and nothing else.
Idealist sends volunteer interest to assigned contacts.
Fix: add a short message form that emails the organization without exposing its address, with rate limiting.

## 5. Money and transparency

### OG-17 Nothing explains how support money reaches the organization
Status: needs decision. Priority: P2.
The Support button verifies the payment signature and records the order.
The specs do not say how money moves from the payment account to the organization, who pays fees, or what happens on a failure.
Fix: decide the model (direct to the organization, or held and paid out), then say it on the page and in the specs.
If KarmaCircle never holds money, say that plainly.

### OG-18 No receipts, tax certificates or recurring giving
Status: open. Priority: P3.
A supporter gets no receipt for tax purposes, and cannot give monthly.
Zeffy, Givebutter and GlobalGiving all offer receipts.
Fix: decide which receipts the product can honestly issue (it depends on the organization's own tax status), then add a receipt email and an optional recurring option.

### OG-19 No refund or dispute path
Status: open. Priority: P3.
A supporter who paid the wrong amount has no route to ask for a refund.
Fix: write a short refund policy, add a contact route, and record disputes against the order.

## 6. Discovery, search engines and analytics

### OG-20 Directory filters are limited
Status: open. Priority: P3.
Filters are search, tag, domain and city, and the taxonomy is a closed list.
Fix: add distance or region filtering, a sort choice, and a way to request a new tag, without breaking the closed vocabulary the setup form relies on.

### OG-21 No structured data for search engines
Status: open. Priority: P2.
A search of the web code found no structured data on the organization or event pages.
Fix: add `schema.org` organization markup to the public profile, and only state what is visible on the page.
Pair this with PG-20 in the events list.

### OG-22 Analytics are raw page views
Status: open. Priority: P3.
The dashboard counts views per day.
It does not count unique visitors, show where they came from, or export.
LinkedIn gives analysts export access.
Fix: decide what is worth knowing, add it without storing IP or browser identifiers, and keep the one-year expiry on analytics records.

## 7. Code health

### OG-23 The legacy `?userName=` branch returns any user
Status: open. Priority: P3.
`GET /organizations?userName=<name>` looks up any user, so it returns an individual with `200`.
It is recorded as known-broken in the API organizations spec.
Fix: remove the branch if nothing calls it, or restrict it to organization accounts.
Confirm no frontend call site uses it first.

## 8. Backend stack and architecture

Review date: 2026-11-16.
Summary of the review: the backend is strict TypeScript on Node with Express, Mongoose, Zod, signed-cookie sessions, Jest and a Vercel serverless deploy.
It is a sound base, not "basic JavaScript".
The versions are behind, and most real limits are operational and data-model issues, not language limits.

### ST-1 Consider moving from MongoDB to PostgreSQL
Status: needs decision. Priority: P2.
The data is relational: users, organizations, events, registrations, orders and follows.
Several open items are race conditions that SQL constraints and transactions prevent more naturally.
Examples: unique usernames (DB-6), not overselling the last event spot (PG-5), and one registration per person and event.
Orders and verification history also benefit from transactions and foreign keys.
A migration would also settle the "link by id, not by address" question (DB-5).
Fix: decide first, then plan it as its own project: schema design, a query layer (Prisma, Drizzle or Kysely are the usual TypeScript choices), a data migration script, and test updates.
Keep the module and service structure, since only the persistence layer changes.
Images should go to object storage either way (OG-7, DB-1).

### ST-2 Upgrade Express 4 to Express 5
Status: open. Priority: P2.
The API depends on `express` `^4.17`.
Express 5 is the current default release and handles rejected promises in route handlers natively.
Fix: upgrade, review the breaking changes, and check that `asyncHandler` is still needed.
Run the full API suite afterwards.

### ST-3 Upgrade Mongoose 7 to Mongoose 8
Status: open. Priority: P2.
The API depends on `mongoose` `^7.5`, and Mongoose 8 is current.
Fix: upgrade and run the suite.
If ST-1 goes ahead, this becomes a stop-gap, so mark it superseded by ST-1 in that case.

### ST-4 Upgrade Zod 3 to Zod 4
Status: open. Priority: P3.
The API depends on `zod` `^3.22`.
Zod 4 is current, and the dependency audit in S-3 of the events list already names `zod`.
Fix: upgrade, review schema and error-format changes, and rerun the validation tests.

### ST-5 Raise the Node version floor
Status: open. Priority: P2.
`engines` says `node >=18`, and Node 18 is no longer supported.
Fix: set the floor to a currently supported long-term release, and make CI, Vercel and local development use the same version.

### ST-6 Clear the known vulnerable packages
Status: open. Priority: P1.
This is S-3 in the events list: a production audit found 1 critical and 12 high issues.
It is repeated here because it belongs with the upgrades above and is the first thing a reviewer would run.
Fix: update the packages, rerun the audit, and add the audit to CI.

### ST-7 Fix the operational limits that hold back scale
Status: open. Priority: P1.
These already exist in the events list and apply to the whole API.
They are the real scalability limits, and a rewrite in any language would keep them:
1. S-1, the session cookie is written to the logs.
2. S-2, rate limits live in memory, so they do not work across serverless instances.
3. O-1, a failed first database connection is remembered by the serverless handler.
4. DB-1, cover images are stored inside event documents.
5. DB-3, missing indexes, and the unindexed directory search.
6. S-4, a 10 MB body limit on every route.
Fix: work these first.
Tick them off in the events list and note it here.

### ST-8 Consider a more structured framework
Status: needs decision. Priority: P3.
Express is minimal, and the module layout (routes, controller, service, validation, model) is already disciplined.
Fastify and NestJS are the usual next steps in TypeScript, adding built-in validation, dependency injection and better performance defaults.
Fix: decide whether the extra structure is worth the move, or whether upgrading Express (ST-2) is enough.

### ST-9 Optional: one small service in another language
Status: needs decision. Priority: P3.
If Tamal wants a polyglot story, add one bounded service in Go or .NET and do not rewrite the API.
Good candidates: the reminder and notification worker (PG-18, OG-15) or event check-in.
It shows choosing a language for a problem, and the main API keeps working.
Fix: decide whether the story is worth the extra moving part, and which job it owns.
If yes, define the contract between it and the API first.

### ST-10 Write down the stack decision for the showcase
Status: open. Priority: P3.
Reviewers will ask why this stack.
Fix: add a short architecture decision record in `apps/api/docs/specs/architecture.md` covering why TypeScript and Node, why MongoDB or PostgreSQL once ST-1 is decided, what was considered and rejected (see section 9), and the trade-offs.
Keep it factual and keep it updated as ST items ship.

## 9. Considered and not recommended

Do not repeat these without a new reason.

### Full rewrite of the API in Go, Rust or .NET
Status: not recommended, 2026-11-16.
The API is mostly input and output bound: it waits on the database and on payments, so the language is not the bottleneck.
The real limits are listed in ST-7 and would carry over to a rewrite.
Rust costs a lot of development time for no measurable gain on this kind of API.
Go and .NET are good, mature choices, and nothing here rules them out, but a rewrite would also give up using one language, TypeScript, across the API and the React app.
Reconsider only if a measured bottleneck appears that Node cannot meet, or if a part of the system needs a different runtime model.
Replaced by: ST-1 (PostgreSQL), ST-2 to ST-5 (upgrades) and ST-9 (one small service in another language, if wanted).

## 10. Decisions needed from Tamal

1. Verification: what must an organization provide, and who reviews it (OG-1, OG-2).
2. Ranking: confirm that the support switch stops affecting directory order (OG-5).
3. Roles: should organization members have roles, and which (OG-12).
4. Handle change, unpublish and delete: decide each (OG-13).
5. Money model: how support money reaches the organization (OG-17).
6. Receipts: which receipts the product can honestly issue (OG-18).
7. Database: stay on MongoDB, or move to PostgreSQL (ST-1).
8. Framework: upgrade Express, or move to Fastify or NestJS (ST-8).
9. Another language: add one small service in Go or .NET, or keep one language (ST-9).

## 11. Done

Nothing done yet.
