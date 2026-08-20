# Graph Report - /Users/tamalcodes/Gh/KarmaCircle-BE  (2026-08-20)

## Corpus Check
- 61 files · ~53,766 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 179 nodes · 179 edges · 53 communities detected
- Extraction: 65% EXTRACTED · 35% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `findByEmail()` - 9 edges
2. `toSkipLimit()` - 7 edges
3. `buildPaginationMeta()` - 7 edges
4. `loginSuccess()` - 7 edges
5. `signup()` - 6 edges
6. `sanitize()` - 6 edges
7. `listClubs()` - 5 edges
8. `issueOAuthSession()` - 5 edges
9. `signToken()` - 5 edges
10. `readableCookieOptions()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Backend Tech Stack` --semantically_similar_to--> `Techstack Overview`  [INFERRED] [semantically similar]
  README.md → docs/BackendSetup.md
- `MIT License Notice` --semantically_similar_to--> `License and Attribution`  [INFERRED] [semantically similar]
  README.md → CODE_OF_CONDUCT.md
- `Reporting Guidelines` --semantically_similar_to--> `Reporting a Vulnerability`  [INFERRED] [semantically similar]
  CODE_OF_CONDUCT.md → SECURITY.md
- `Creating an Issue` --semantically_similar_to--> `Reporting a Vulnerability`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → SECURITY.md
- `buildTestApp()` --calls--> `createApp()`  [INFERRED]
  tests/helpers/test-app.ts → src/app.ts

## Hyperedges (group relationships)
- **Pull Request Contribution Workflow** — contributing_creating_issue, contributing_working_on_issue, contributing_closing_issue, contributing_creating_pr, contributing_pr_title_format, contributing_reviewing_pr [EXTRACTED 0.90]
- **Local Project Setup Flow** — clonesetup_forking, clonesetup_cloning, backendsetup_installing_dependencies, backendsetup_env_setup [EXTRACTED 0.85]
- **Environment Secrets Configuration** — backendsetup_env_setup, backendsetup_google_client_setup, backendsetup_razorpay_setup [EXTRACTED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (19): Addressing Grievances, Consequences of Unacceptable Behavior, Contact Info, Expected Behavior, JWOC Code of Conduct Purpose, Open Source Citizenship Goal, Reporting Guidelines, Code of Conduct Scope (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (11): listClubs(), listAllUsers(), listClubs(), listEvents(), createEvent(), findAll(), findByUid(), buildPaginationMeta() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (10): googleCallback(), issueOAuthSession(), logout(), signin(), signup(), clearedCookieOptions(), httpOnlyCookieOptions(), readableCookieOptions() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.27
Nodes (12): loginSuccess(), findOrCreateGoogleUser(), signin(), signToken(), signup(), updatePassword(), dashboard(), profile() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (13): Installing Dependencies, Techstack Overview, Cloning the Repository, Forking the Repository, Clone Setup Next Steps, Django Code of Conduct, Geek Feminism Anti-Harassment Policy, License and Attribution (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (6): listUsers(), completeProfile(), findByUsername(), findIndividuals(), toUserUpdate(), updateProfile()

### Community 6 - "Community 6"
Cohesion: 0.2
Nodes (5): createApp(), connectToMongo(), handler(), main(), buildTestApp()

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (2): getProduct(), findBySlug()

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (6): Charity/NGO Collaboration Hub Purpose, Milan Landing Page (Desktop Mockup), Milan Platform, Milan Mobile Web View (milanhub.org), Milan Promotional Banner, Tagline: 'United, We Achieve Greatness'

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (1): AppError

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (2): createReport(), hasReportedRecently()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (3): Setting up .env, Setting up Google Client ID and Secret, Setting up Razorpay API Key

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): Coding Standards, Backend Setup Next Steps

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **15 isolated node(s):** `Milan Project Overview`, `JWOC Code of Conduct Purpose`, `Weapons Policy`, `Code of Conduct Scope`, `Contact Info` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (2 nodes): `users.test.ts`, `signupAndGetCookie()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `signupAndGetCookie()`, `events.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `signup()`, `products.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `validate.ts`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `skipInTest()`, `rate-limit.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `requireAuth()`, `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `loadEnv()`, `env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `asyncHandler()`, `async-handler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `createOrder()`, `payment.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `createOrder()`, `payment.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Coding Standards`, `Backend Setup Next Steps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `commitlint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `auth.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `env.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `jest.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `express.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `logger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `passport.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `swagger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `http-status.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `payment.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `payment.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `club.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `club.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `product.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `product.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `product.model.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `auth.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `auth.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `directory.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `directory.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `user.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `user.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `event.model.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `event.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `event.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `report.model.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `report.validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `report.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `findByEmail()` connect `Community 3` to `Community 1`, `Community 5`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `loginSuccess()` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `listProducts()` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `findByEmail()` (e.g. with `dashboard()` and `loginSuccess()`) actually correct?**
  _`findByEmail()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `toSkipLimit()` (e.g. with `listClubs()` and `listProducts()`) actually correct?**
  _`toSkipLimit()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `buildPaginationMeta()` (e.g. with `listClubs()` and `listProducts()`) actually correct?**
  _`buildPaginationMeta()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `loginSuccess()` (e.g. with `findByEmail()` and `clearedCookieOptions()`) actually correct?**
  _`loginSuccess()` has 6 INFERRED edges - model-reasoned connections that need verification._