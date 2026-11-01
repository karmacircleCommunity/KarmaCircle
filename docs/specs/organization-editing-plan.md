# Organization profile editing - implementation plan

This document is the shared product and engineering handoff for the next organization-module work.
It separates current behavior from the proposed editing experience so coding agents do not mistake roadmap for shipped code.

## Current behavior, checked 27 October 2026

1. A user chooses Organization on signup.
2. `POST /auth/signup` creates the organization login and its separate organization record with `status: draft`.
3. `useAuth` sends a new organization to `/organization/setup`.
4. The owner can leave setup and return later; the draft remains private and absent from the public directory.
5. The setup wizard saves the About, Reach, and Support steps to `PATCH /organizations/me`.
6. The backend changes draft to live when description, organization type, at least one focus area, team size, and city are present.
7. A live organization appears in `/organizations` and `/organization/:handle`.

Before this change, the setup wizard also served as the edit form for live organizations, but the public page had no visible owner Edit action.
The first editing release now adds **Edit organization** on the owner's public profile and dashboard, then opens a sectioned editor at `/organization/setup`.
The account menu does not yet link to organization editing.

`PATCH /organizations/me` already accepts several profile details that the setup UI does not expose: website, contact email and phone, street address, map embed URL, logo URL, cover URL, gallery URLs, social links, leadership entries, funding claims, and sponsorship preference.
The public profile already renders several of these fields when present.
Image fields currently accept URLs only; the API does not upload image files or manage media storage.

The API enforces owner access through the authenticated `Token` cookie and rejects non-organization accounts for `/organizations/me`.
Public API responses omit private owner email, member permissions, phone, and draft status.
The API does not let an organization edit its handle, verification, follower count, ownership, or publication status through this update route.

## Market patterns

The research below uses official platform help pages where accessible, checked 27 October 2026.

| Platform | Current pattern | Product lesson for KarmaCircle |
|---|---|---|
| LinkedIn Pages | Page admins use an admin view with a clear **Edit page** entry and separate editable sections; admins can also view the Page as a member. | Put management controls in a clearly marked owner/admin context, and offer a public-view preview. |
| Facebook Pages | Page access is explicit and role-dependent; profile and cover imagery are public-facing Page identity. | Keep owner access distinct from visitor actions and make image visibility clear. |
| Instagram | Profile editing is centered on an **Edit profile** surface for bio and external links, with account controls separated from public profile viewing. | Give common identity fields one predictable edit entry, grouped by purpose. |
| X | The profile has an **Edit profile** action for header/photo, name, bio, location, and website, followed by an explicit Save. | Make edits easy to find from the profile itself and make save state explicit. |

Sources: [LinkedIn - Edit your LinkedIn Page](https://www.linkedin.com/help/linkedin/answer/a564346/edit-your-linkedin-page-or-showcase-page?lang=en), [LinkedIn - Pages admin view](https://www.linkedin.com/help/lms/answer/a548316?hcppcid=search), [Facebook - Page access](https://www.facebook.com/help/510247025775149/), [Facebook - public profile information](https://www.facebook.com/help/411239642246274/), [X - customize your profile](https://help.x.com/articles/166743).

Instagram Help Center pages were not returned reliably in this research pass; the Instagram pattern above is a high-level observation, not a verified detailed flow or field-limit specification.
Recheck official Instagram guidance before implementing platform-specific limits.

## Shipped first release

The public profile action appears only when the `GET /organizations/me` handle matches the viewed profile handle.
The dashboard action is available in the live organization dashboard.
The same owner-only route serves editing, so the app has one source of truth for organization changes.

Live editor sections: Profile basics, Location and contact, Social profiles.
Editable fields include organization name, description, type, focus areas, team size, city, region, street address, website, public contact email, private contact phone, and supported social links.
Save uses owner-only `PATCH /organizations/me`; optional empty fields clear their values.
Success and retry feedback are shown, and the editor links back to the public profile.
The responsive editor groups related fields, offers section links, uses selectable focus-area tiles, and shows a live preview on desktop with a collapsed preview on mobile.
Draft signup remains the existing short publish wizard.

Not included yet: map embed, leadership, fundraising details, live editor sponsorship toggle, logo/cover/gallery updates, and account-menu link.
Existing image fields accept URLs only; no API uploads files or manages media storage.
Do not claim that pasted URLs are managed image uploads.
Managed image uploads need storage choice, owner-scoped endpoints, type/size rules, transforms, replacement/removal, and optional publication requirements.

Social links use named platform inputs and URL validation, not arbitrary icon URLs.
Supported platforms: Instagram, Facebook, X, LinkedIn, YouTube.
Keep public links external, visibly identifiable, and opened safely.

## Delivery phases

### P0 - Make existing editing discoverable - shipped 27 October 2026

- [x] Add owner-only **Edit organization** entries to the public profile and live dashboard.
- [x] Route both entries to `/organization/setup`; use one live editor.
- [x] Keep the short setup path for drafts and show broader profile fields to live organizations.
- [x] Compare the public profile handle to the authenticated owner's server-loaded organization record before showing the profile edit link.

### P1 - Core editor - shipped 27 October 2026

- Section the live edit experience while preserving short draft setup.
- Edit core organization details, address, website, public email, private phone, and social links.
- Keep private owner/member data out of the public API response and label private phone accurately.
- Support clearing optional values without silently dropping sibling fields.

### P1 follow-on - Complete remaining profile fields

- Add map embed, leadership cards, fundraising details, and live sponsorship controls where appropriate.
- Add account-menu entry for owners.
- Add confirmation for consequential changes such as disabling support.

### P2 - Managed image uploads

- Choose a managed storage provider and define access, retention, size/type limits, image transforms, and deletion behavior.
- Add authenticated owner-scoped upload and removal endpoints.
- Add logo and cover upload/crop controls; add gallery and leadership photo support only if product needs justify them.
- Keep existing fallback styling and make image upload optional.

### P3 - Organization operations

- Decide whether organizations need multiple owners/editors, invitations, role permissions, or an audit history before adding collaborators.
- Decide separately whether handle changes, deliberate unpublishing, verification, or ownership transfer are supported; they are not part of ordinary profile editing today.
- Add change history and moderation/reporting rules if public identity fields need review.

## Acceptance criteria

- An owner can reach editing from their public organization page and live dashboard.
- A visitor or a different organization cannot see or use owner edit controls or mutate the record.
- Existing live URLs and public pages continue to work while optional fields are edited or cleared.
- Drafts stay private until all required publication fields are present.
- Saves persist across refresh, return updated public data, and expose validation and retry states accessibly.
- Mobile and desktop users can complete every edit section.
- Image uploads, if included, are real persisted assets rather than local previews or remote URLs pasted into a field.
- Frontend specs, backend organization spec, API contract, route/source code, and the Miro organization flow describe the same behavior.

## Agent entry points

For current behavior, start with [frontend organization spec](./organizations.md), [frontend route flow](./user-flows.md#organization-profile-setup-and-editing), [frontend implementation spec](../../apps/web/src/features/organizations/SPEC.md), and [backend organization spec](../../apps/api/docs/specs/organizations.md).
Before route or payload changes, read [API contract](../../apps/api/docs/specs/api-contract.md) and [frontend API integration](./api-integration.md).
Check both apps' known-issues docs before implementation.
Keep this plan updated as features move from proposed to shipped, and keep the matching [Claude Dashboard Miro board](https://miro.com/app/board/uXjVHHhntxM=/) aligned.
