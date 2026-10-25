# User Flows

This file is the visual complement to the feature specs, not a replacement for them.
It shows how a visitor actually moves between pages and states: what each page branches on, what a button does, and where a known bug breaks the flow.
For the business logic behind any node here, follow the link in its label to the owning spec - [authentication.md](./authentication.md), [organizations.md](./organizations.md), [events.md](./events.md), [landing-home.md](./landing-home.md), [onboarding-profile.md](./onboarding-profile.md), [dashboard.md](./dashboard.md).
These diagrams describe the code as it exists today, rough edges included, the same as every other file in this directory - see [known-issues.md](./known-issues.md) for the write-ups behind the broken-looking nodes below.
Update the relevant diagram in the same change whenever a route, redirect, or gated page changes - see the root [CLAUDE.md](../../CLAUDE.md) "Docs and memory move with the code" rule.

Every diagram uses the same three node colors:

- **Yellow** - a page, section, or action.
- **Blue** - a decision point (the branch condition is on the arrows out of it).
- **Green** - a true start/end point, a redirect target, or a documented known issue.
- **Dashed arrows** mark a hypothetical or not-currently-reachable path, called out explicitly in the node text.

## Site map

The top-level view: every route, the main redirects, and which pages gate on account type or organization status.
Start here before opening one of the detailed diagrams below.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    start(["Visitor arrives"]):::terminator
    home["Home - /"]:::general
    cta{{"Signed in already?"}}:::decision
    cta_signup["CTA: Sign up Today!"]:::general
    cta_explore["CTA: Explore our organizations"]:::general
    auth["Authentication - /auth/signin or /auth/signup"]:::general
    acct_type{{"New account type?"}}:::decision
    org_setup["Organization Setup wizard"]:::general
    org_live{{"Required fields complete?"}}:::decision
    org_draft["Draft organization - hidden from directory"]:::general
    orgs_dir["Organizations Directory - /organizations"]:::general
    org_profile["Organization Profile - /organization/:handle"]:::general
    org_dashboard["Dashboard - /dashboard"]:::general
    org_events_admin["Your Events - /organization/events"]:::general
    org_gate{{"Live organization account?"}}:::decision
    gate_refuse["Gate refusal: browse organizations instead"]:::general
    gate_pass["Dashboard / Your Events content"]:::general
    events_dir["Events Directory - /events"]:::general
    event_detail["Event Detail - /events/:eventId"]:::general
    create_event["Create an event button"]:::general
    create_broken["Modal opens but cannot submit"]:::terminator
    user_profile["User Profile - /user/:userName"]:::general
    not_found["404 - unmatched route"]:::terminator

    start --> home
    home --> cta
    cta -->|"No"| cta_signup
    cta -->|"Yes"| cta_explore
    cta_signup --> auth
    cta_explore --> orgs_dir
    home -->|"Navbar"| orgs_dir
    home -->|"Navbar"| events_dir
    home -->|"Navbar, signed in"| org_dashboard
    home -->|"Navbar, organization"| org_events_admin
    home -->|"Navbar"| user_profile
    auth --> acct_type
    acct_type -->|"Individual"| home
    acct_type -->|"Organization"| org_setup
    org_setup --> org_live
    org_live -->|"No"| org_draft
    org_live -->|"Yes"| org_profile
    org_draft -.->|"resume later"| org_setup
    orgs_dir --> org_profile
    org_profile --> event_detail
    org_dashboard --> org_gate
    org_events_admin --> org_gate
    org_gate -->|"No, or logged out"| gate_refuse
    gate_refuse --> orgs_dir
    org_gate -->|"Yes"| gate_pass
    gate_pass --> event_detail
    events_dir --> event_detail
    events_dir --> create_event
    create_event --> create_broken
    event_detail -->|"Hosted by card"| org_profile
    home -.->|"unmatched path"| not_found
```

## Home and your profile

See [landing-home.md](./landing-home.md) and [onboarding-profile.md](./onboarding-profile.md).

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    h_start(["Visitor lands on Home - /"]):::terminator
    h_hero["Hero - tagline and big CTA"]:::general
    h_cta{{"Signed in already?"}}:::decision
    h_cta_signup["CTA: Sign up Today!"]:::general
    h_cta_explore["CTA: Explore our organizations"]:::general
    h_how["How It Works section"]:::general
    h_drives["Drives Rail - sample causes"]:::general
    h_oss["Open Source section"]:::general
    h_footer["Footer"]:::general
    h_navbar["Navbar - always visible"]:::general
    h_nav_orgs["Link: Organizations"]:::general
    h_nav_events["Link: Events"]:::general
    h_nav_signup["Link: Sign Up, shown when logged out"]:::general
    h_nav_dash["Link: Dashboard, shown when logged in"]:::general
    h_nav_yourevents["Link: Your Events, organization accounts"]:::general
    h_nav_finish["Link: Finish setting up, draft organizations"]:::general
    h_oauth["Google OAuth landing pad on mount"]:::general
    u_start(["Visitor opens a profile URL - /user/:userName"]):::terminator
    u_fetch["Public profile fetch"]:::general
    u_owner{{"Is the viewer the profile owner?"}}:::decision
    u_owner_view["Owner view - edit affordances"]:::general
    u_public_view["Public, read-only view"]:::general

    h_start --> h_hero
    h_hero --> h_cta
    h_cta -->|"No"| h_cta_signup
    h_cta -->|"Yes"| h_cta_explore
    h_hero --> h_how
    h_how --> h_drives
    h_drives --> h_oss
    h_oss --> h_footer
    h_start --> h_navbar
    h_navbar --> h_nav_orgs
    h_navbar --> h_nav_events
    h_navbar --> h_nav_signup
    h_navbar --> h_nav_dash
    h_navbar --> h_nav_yourevents
    h_navbar --> h_nav_finish
    h_start --> h_oauth
    u_start --> u_fetch
    u_fetch --> u_owner
    u_owner -->|"Yes"| u_owner_view
    u_owner -->|"No"| u_public_view
```

## Sign in and sign up

See [authentication.md](./authentication.md).
One component, `Auth.tsx`, renders both `/auth/signin` and `/auth/signup`; the URL does not decide which form shows, the email-lookup result does.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    a_start(["Visitor clicks Sign Up or Sign In"]):::terminator
    a_email["Email step: choose Individual or Organization, enter email"]:::general
    a_google["Continue with Google button"]:::general
    a_check{{"Does this email already exist?"}}:::decision
    a_error["Error toast - stays on email step"]:::general
    a_signin["Sign In: password field + Forgot password link"]:::general
    a_signup["Sign Up: name field + password + strength meter"]:::general
    a_forgot["Forgot Password - /auth/forgot-password"]:::general
    a_reset["Reset Password - /auth/reset-password/:token"]:::general
    a_newtype{{"New account type?"}}:::decision
    a_individual_ok["Redirect to Home - /"]:::terminator
    a_org_setup["Redirect to Organization Setup - /organization/setup"]:::terminator
    a_signin_ok["Redirect to Home - /"]:::terminator

    a_start --> a_email
    a_email --> a_google
    a_email --> a_check
    a_check -->|"Yes"| a_signin
    a_check -->|"No"| a_signup
    a_check -->|"Malformed response"| a_error
    a_error -.-> a_email
    a_signin --> a_forgot
    a_forgot --> a_reset
    a_signin --> a_signin_ok
    a_signup --> a_newtype
    a_newtype -->|"Individual"| a_individual_ok
    a_newtype -->|"Organization"| a_org_setup
```

## Organizations - directory, profile, and admin surfaces

See [organizations.md](./organizations.md) and [dashboard.md](./dashboard.md).
`OrganizationSetupGate` is the one mechanism behind both `/dashboard` and `/organization/events` - it is not a route guard, it wraps page content.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    o_start(["Visitor opens Organizations"]):::terminator
    o_taxonomy["Cause filter chips - GET /organizations/taxonomy"]:::general
    o_search["Search and domain filter - server-side"]:::general
    o_featured["Featured strip - sponsored orgs, shown only when unfiltered"]:::general
    o_grid["Grid of Organization Cards"]:::general
    o_dashlink["Toolbar: Your dashboard button"]:::general
    o_profile_fetch{{"Organization found and live?"}}:::decision
    o_404["404 - same for draft org or unknown handle"]:::terminator
    o_header["Cover, logo, verified badge, tagline, meta chips"]:::general
    o_social["Social links"]:::general
    o_stats["Stat strip"]:::general
    o_about["About us / What we work on"]:::general
    o_drives["Drives running now"]:::general
    o_track["Track record - milestones timeline"]:::general
    o_team["Our team - leadership"]:::general
    o_events["Events hosted - GET /events?host=handle"]:::general
    o_sponsor{{"Sponsorship enabled?"}}:::decision
    o_sponsor_modal["Sponsor Organization modal"]:::general
    o_scroll["Scroll-to-Drives button"]:::general
    o_follow["Follow button - local state only, no backend"]:::general
    o_contact["Get in touch card - address, email, followers, map"]:::general
    o_gate{{"Viewer is a live organization account?"}}:::decision
    o_refuse["Gate refusal: this page is for organizations"]:::general
    o_checklist["Draft org: setup checklist + Finish setup link"]:::general
    o_dashboard_content["Dashboard content: cover, counts, Edit Profile, Analytics coming soon"]:::general
    o_yourevents_content["Your Events content: this org's live events list"]:::general

    o_start --> o_taxonomy
    o_taxonomy --> o_search
    o_search --> o_featured
    o_featured --> o_grid
    o_grid --> o_profile_fetch
    o_dashlink --> o_gate
    o_profile_fetch -->|"No"| o_404
    o_profile_fetch -->|"Yes"| o_header
    o_header --> o_social
    o_social --> o_stats
    o_stats --> o_about
    o_about --> o_drives
    o_drives --> o_track
    o_track --> o_team
    o_team --> o_events
    o_header --> o_sponsor
    o_sponsor -->|"Yes"| o_sponsor_modal
    o_sponsor -->|"No"| o_scroll
    o_header --> o_follow
    o_header --> o_contact
    o_gate -->|"No, or logged out"| o_refuse
    o_refuse --> o_grid
    o_gate -->|"Draft"| o_checklist
    o_gate -->|"Live"| o_dashboard_content
    o_gate -->|"Live"| o_yourevents_content
```

## Events - directory, detail, and creating one

See [events.md](./events.md) and [known-issues.md](./known-issues.md).
The create-event path is deliberately drawn with its real, broken state: `CreateEvent.tsx` (the modal actually wired to the "Create an event" button) can never be submitted, and even if it could, it calls the wrong endpoint.
`CreateEvents.tsx` is the correct implementation and is not rendered from any page today.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    e_start(["Visitor opens Events"]):::terminator
    e_fetch["GET /events, limit 100 - fetched once"]:::general
    e_search["Search - client-side"]:::general
    e_time["Upcoming / Past filter - client-side"]:::general
    e_type["Type filter: invite-only, open, online, offline - client-side"]:::general
    e_grid["Grid of Event Cards"]:::general
    e_create_btn["Create an event button"]:::general
    e_modal["CreateEvent.tsx modal opens"]:::general
    e_wired{{"Are the address fields wired to inputs?"}}:::decision
    e_disabled["Save button stays disabled - cannot submit"]:::terminator
    e_wrong["If it could submit: patches the USER profile, not an event"]:::general
    e_real["CreateEvents.tsx - the correct version, never rendered anywhere"]:::terminator
    e_backend{{"Backend: is the host an organization account?"}}:::decision
    e_rejected["403 NOT_AN_ORGANIZATION"]:::terminator
    e_saved["Event saved with organizerHandle from host"]:::terminator
    e_detail_fetch{{"Event found?"}}:::decision
    e_404["Not-found state"]:::terminator
    e_hero["Event Hero"]:::general
    e_about["About this event"]:::general
    e_facts["The details - Event Facts"]:::general
    e_agenda["How the day runs - Agenda, if any"]:::general
    e_location["Where it is / How to join"]:::general
    e_bring["What to bring"]:::general
    e_join["Join Panel - cost, capacity, Join button, local only"]:::general
    e_timing{{"Event timing?"}}:::decision
    e_completed["Completed wrap-up shown instead of Join"]:::general
    e_invite{{"Invite only?"}}:::decision
    e_nojoin["No join control shown"]:::general
    e_joinactive["Join button active"]:::general
    e_organizer["Organizer Panel - Hosted by, links to organization profile"]:::general
    e_fundraiser["Fundraiser Panel - shown only if the event has one"]:::general
    e_mobilebar["Mobile Action Bar - fixed bottom, hides near Join Panel or footer"]:::general

    e_start --> e_fetch
    e_fetch --> e_search
    e_search --> e_time
    e_time --> e_type
    e_type --> e_grid
    e_grid --> e_create_btn
    e_create_btn --> e_modal
    e_modal --> e_wired
    e_wired -->|"No - never wired"| e_disabled
    e_disabled -.->|"hypothetically, if it could submit"| e_wrong
    e_modal -.->|"correct component exists separately"| e_real
    e_real -.-> e_backend
    e_backend -->|"No"| e_rejected
    e_backend -->|"Yes"| e_saved
    e_grid --> e_detail_fetch
    e_detail_fetch -->|"No"| e_404
    e_detail_fetch -->|"Yes"| e_hero
    e_hero --> e_about
    e_about --> e_facts
    e_facts --> e_agenda
    e_agenda --> e_location
    e_location --> e_bring
    e_hero --> e_join
    e_join --> e_timing
    e_timing -->|"Past"| e_completed
    e_timing -->|"Upcoming"| e_invite
    e_invite -->|"Yes"| e_nojoin
    e_invite -->|"No"| e_joinactive
    e_join --> e_organizer
    e_join --> e_fundraiser
    e_hero --> e_mobilebar
```
