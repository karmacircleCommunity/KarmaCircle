# Organizations — E2E coverage

Playwright specs for `apps/web/src/features/organizations/`. See [docs/specs/organizations.md](../../../../docs/specs/organizations.md) — the draft→live setup wizard is the feature's centerpiece and this folder's only spec.

## Files

| File | Covers |
|---|---|
| [organization-setup.spec.ts](./organization-setup.spec.ts) | The full organization lifecycle: sign up, stay hidden as a draft, resume from the dashboard gate, fill in each required question across both setup steps, go live, appear in the directory (with its own filters), and come back to edit afterward. Ported from the original Cypress `organizationSetup.spec.js` — see [docs/specs/testing.md](../../../../docs/specs/testing.md) for the migration notes and two real behavior/doc mismatches this port surfaced |

## What's not covered, on purpose

- **The public organization directory/profile pages on their own** (`/organizations`, `/organization/:userName`) outside of what `organization-setup.spec.ts` already exercises as part of the lifecycle — no dedicated filter/pagination/search spec yet.
- **Editing an already-live organization's profile** beyond the one "coming back to edit" step at the end of the existing spec.
- **The organization dashboard** (`OrganizationSetupGate`, `Dashboard.tsx`'s organization-specific rendering) beyond the one gate-resume interaction the setup spec touches.

## Keeping this honest

If you add a spec file to this folder, add it to the table above.
