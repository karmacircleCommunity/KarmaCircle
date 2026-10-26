# User Flows

This file is the visual complement to the feature specs, not a replacement for them.
The matching Miro flows live on [Claude Dashboard](https://miro.com/app/board/uXjVHHhntxM=/); keep both representations updated when changing these flows.
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
    create_access{{"Token cookie, signed in, organization account?"}}:::decision
    create_hidden["Browse events - no creation button or modal"]:::general
    create_event["Create an event button"]:::general
    create_broken["Modal opens but cannot submit"]:::terminator
    personal_setup["Individual profile setup - /user/setup"]:::general
    not_found["404 - unmatched route"]:::terminator

    start --> home
    home --> cta
    cta -->|"No"| cta_signup
    cta -->|"Yes"| cta_explore
    cta_signup --> auth
    cta_explore --> orgs_dir
    home -->|"Navbar"| orgs_dir
    home -->|"Navbar"| events_dir
    home -->|"Navbar, organization"| org_dashboard
    home -->|"Navbar, organization"| org_events_admin
    home -->|"Navbar Edit profile, individual"| personal_setup
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
    events_dir --> create_access
    create_access -->|"Yes"| create_event
    create_access -->|"No"| create_hidden
    create_event --> create_broken
    event_detail -->|"Hosted by card"| org_profile
    personal_setup -->|"Save, Close, or Maybe later"| home
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
    h_nav_dash["Link: Dashboard, organization accounts"]:::general
    h_nav_yourevents["Link: Your Events, organization accounts - desktop menu"]:::general
    h_nav_finish["Link: Finish setting up, draft organizations"]:::general
    h_oauth["Google OAuth landing pad on mount"]:::general
    u_personal["Individual: navbar Edit profile - /user/setup"]:::general
    u_org_record["Public organization details: /organization/setup"]:::general

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
    h_navbar --> u_personal
    h_nav_finish --> u_org_record
```

## Individual profile setup and editing

Checked against `ProfileSetup.tsx`, `useProfileSetup.ts`, `profileSetup.ts`, `profileSetupForm.ts`, and the users API on 26 October 2026.
This describes current code, including the failure paths; it is not a claim that the app was run during this documentation update.
See [onboarding-profile.md](./onboarding-profile.md) and [known-issues.md](./known-issues.md#individual-profile-setup---flow-audit-26-october-2026).
New individual signup still goes to Home; setup starts from desktop/mobile Edit profile or a direct `/user/setup` link.
Signed-out direct visits redirect to `/auth/signin`; remembered login is verified before app startup.
All three questions are optional, and the URL records the question position, not unsaved answers.
Only the final Save changes sends the complete form; moving between questions does not save.
Close and Maybe later discard unsaved changes and return Home.
Successful save returns Home; no completion bypass is needed after removing the sparse profile page.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    p_start(["Individual: navbar Edit profile"]):::terminator
    p_load["/user/setup - GET /user/profile; seed saved answers"]:::general
    p_loaded{{"Profile loaded?"}}:::decision
    p_auth["401: clear login and redirect to sign-in; other load errors: Try again"]:::general
    p_intro["Intro: start or continue editing"]:::general
    p_bio["1. Bio - optional"]:::general
    p_city["2. City and state - optional; city suggestions / use my location"]:::general
    p_address["3. Address - optional; line1, line2, country, pincode"]:::general
    p_places["Google key set: address suggestions fill all six address fields; otherwise plain text"]:::general
    p_google_gap(["Live Google Places behavior remains unverified"]):::terminator
    p_save["Save changes: PATCH /user/update; full bio and all six address fields"]:::general
    p_ok{{"Save succeeded?"}}:::decision
    p_refresh["Revalidate own-profile cache; success toast"]:::general
    p_profile(["Navigate Home - /"]):::terminator
    p_retry["Error toast; keep answers and stay on final question"]:::general
    p_close["Close or Maybe later: discard unsaved changes; no API save or toast"]:::general
    p_return(["Replace setup with Home - /"]):::terminator

    p_start --> p_load --> p_loaded
    p_loaded -->|"No"| p_auth
    p_loaded -->|"Yes"| p_intro
    p_intro -->|"Start / continue"| p_bio
    p_intro -->|"Maybe later or Close"| p_close
    p_bio -->|"Continue - no save"| p_city
    p_city -->|"Continue - no save"| p_address
    p_address -->|"Save changes"| p_save --> p_ok
    p_city -->|"Back"| p_bio
    p_address -->|"Back"| p_city
    p_bio -->|"Back"| p_intro
    p_address --- p_places --- p_google_gap
    p_ok -->|"Yes"| p_refresh --> p_profile
    p_ok -->|"No"| p_retry -->|"Retry"| p_save
    p_bio -->|"Close from any screen"| p_close
    p_close --> p_return
```

## Organization profile setup and editing

Checked against `OrganizationSetup.tsx`, `useOrganizationSetup.ts`, `organizationSetup.ts`, `organizationSetupForm.ts`, and `organization.service.ts` on 26 October 2026.
See [organizations.md](./organizations.md#the-setup-flow--organizationsetup) and [the backend organization spec](../../apps/api/docs/specs/organizations.md).
This wizard updates the separate Organization record; the legacy organization-account `ProfileUpdate` modal updates the User record instead.
The wizard has 13 questions across About (4), Reach (4), and Presence (5).
Required answers block Continue, but Close can save an incomplete step and leave.
Every changed step saves only its own fields; an unchanged step skips the request.
Publication happens on whichever save first satisfies the backend's five required fields, normally the Reach save, before the optional Presence questions finish.
A live organization stays live when subsequently edited.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    os_start(["Organization signup, Navbar resume, draft dashboard / events gate, or direct link"]):::terminator
    os_load["/organization/setup - GET /organizations/me and taxonomy; seed saved answers"]:::general
    os_access{{"Signed-in organization record loaded?"}}:::decision
    os_refuse["Failure: organization sign-in message"]:::general
    os_stage{{"Explicit step in URL or already live?"}}:::decision
    os_intro["Draft intro: start / continue or Maybe later"]:::general
    os_home(["Home - /"]):::terminator
    os_about["About: name, description, organization type, 1-5 causes"]:::general
    os_reach["Reach: team size, city/state, optional contacts and funding"]:::general
    os_presence["Presence - optional: logo/cover URLs, socials, address/map, leadership, sponsorship"]:::general
    os_validate{{"Required answers present and current question format valid?"}}:::decision
    os_fix["Refuse Continue; show field error and focus answer"]:::general
    os_boundary{{"Last question of this step?"}}:::decision
    os_next["Next question - no save"]:::general
    os_save["Save changed step: PATCH /organizations/me; untouched step skips request"]:::general
    os_ok{{"Save succeeded?"}}:::decision
    os_retry["Error toast; stay and preserve answers for retry"]:::general
    os_publish["Server checks description, type, causes, team size and city on every save; publish draft when complete"]:::general
    os_more{{"More steps?"}}:::decision
    os_live{{"Organization live at end?"}}:::decision
    os_profile(["Public profile - /organization/:handle"]):::terminator
    os_draft["Still draft: show missing details and stay; hidden publicly"]:::general
    os_exit["Close: validate current formats, save current step; stay on failure"]:::general
    os_back_gap(["Known gap: live organization's first Back returns to first question, not intro"]):::terminator

    os_start --> os_load --> os_access
    os_access -->|"No"| os_refuse
    os_access -->|"Yes"| os_stage
    os_stage -->|"No - draft"| os_intro
    os_stage -->|"Yes - resume URL step, else About"| os_validate
    os_intro -->|"Start / continue"| os_about
    os_intro -->|"Maybe later - no save"| os_home
    os_about --> os_validate
    os_reach --> os_validate
    os_presence --> os_validate
    os_validate -->|"No"| os_fix -->|"Correct answer"| os_validate
    os_validate -->|"Yes"| os_boundary
    os_boundary -->|"No"| os_next --> os_validate
    os_boundary -->|"Yes"| os_save --> os_ok
    os_ok -->|"No"| os_retry -->|"Retry"| os_save
    os_ok -->|"Yes"| os_publish --> os_more
    os_more -->|"After About"| os_reach
    os_more -->|"After Reach"| os_presence
    os_more -->|"No"| os_live
    os_live -->|"Yes"| os_profile
    os_live -->|"No"| os_draft
    os_validate -->|"Close from any question"| os_exit
    os_exit -->|"Successful save - same publication rule"| os_home
    os_about --- os_back_gap
```

Back moves to the previous question, or the preceding step's last question, without saving.
For a draft, Back from the first question reaches the intro; for a live organization, the documented first-question Back gap applies.
The setup gate resumes at the first step with missing required fields, not necessarily the last question visited.
Refresh keeps URL position and server-saved answers; it loses edits made since the last step save.

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
Creation controls require the `Token` cookie, Redux login state, and an organization account; personal accounts and signed-out visitors only browse.
The API independently rejects personal-account creation requests with `403`.
Upcoming is the default filter and compares each event start time to the current time when the page opens.
Expired demo dates therefore belong under Past, even when the API returns many records.
Refresh demo dates from `apps/api` with `pnpm exec tsx scripts/seed-demo-data.ts --events-only`; this changes only known demo events.
On 26 October 2026, the refreshed local API returned 18 demo events: 15 upcoming and 3 past.
Search matches over returned names, organizers, descriptions, cities, countries, platforms, and modes were checked against the live API data; no browser check was run.
Personalized feed remains deferred; persistent attendance and following are not implemented yet, and existing Join/Follow controls only change local UI state.

```mermaid
flowchart TD
    classDef general fill:#FFE86D,stroke:#A28E26,color:#574900
    classDef decision fill:#9CE6FF,stroke:#2C97BB,color:#1C4657
    classDef terminator fill:#B3E65F,stroke:#6E9A24,color:#2F440B

    e_start(["Visitor opens Events"]):::terminator
    e_fetch["GET /events, limit 100 - SWR fetch and revalidation"]:::general
    e_search["Search - client-side"]:::general
    e_time["Upcoming / Past filter - client-side"]:::general
    e_type["Type filter: invite-only, open, online, offline - client-side"]:::general
    e_grid["Grid of Event Cards"]:::general
    e_access{{"Token cookie, signed in, organization account?"}}:::decision
    e_browse["Personal account or visitor - no creation controls"]:::general
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
    e_start --> e_access
    e_access -->|"Yes"| e_create_btn
    e_access -->|"No"| e_browse
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
