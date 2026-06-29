# NGOWorld (Milan) — Architecture Diagrams

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph Browser["Browser / PWA Client"]

        subgraph Boot["App Bootstrap — index.jsx"]
            REDUX[Redux Provider]
            PERSIST[PersistGate]
            HELMET[HelmetProvider]
            QUERY[QueryClientProvider]
            DATE[LocalizationProvider]
        end

        subgraph Routing["React Router v6 — routesConfig.jsx"]
            HOME["/ — Home"]
            SIGNIN["/auth/signin — SignIn"]
            SIGNUP["/auth/signup — SignUp"]
            PROFILE["/user/:userName — Profile"]
            CLUBS["/clubs — Clubs"]
            CLUBDETAIL["/club/:userName — Club Profile"]
            DASHBOARD["/dashboard — Dashboard"]
            EVENTS["/events — Events"]
            SHOP["/shop — Shop (WIP)"]
            TRENDING["/trending — Trending"]
            E404["/* — Error 404"]
        end

        subgraph Guard["Route Guard"]
            HOC["DonotRenderWhenLoggedIn HOC\nChecks Token cookie + Redux isLoggedIn"]
        end

        subgraph State["State Management"]
            RTK["Redux Toolkit\nuserSlice — user session\nPersisted to localStorage"]
            ZUS["Zustand\nuseAuth — isLoading flag"]
            RQ["TanStack React Query v5\nServer data cache"]
            SWR["SWR\nEvents cache"]
        end

        subgraph API["API Layer"]
            MILAN["service/MilanApi.js\n(Auth, User, Clubs, Events)"]
            CONNECTOR["integrations/ApiConnector.js\n(Generic Axios wrapper)"]
            ENDPOINTS["integrations/ApiEndpoints.js\n(Centralised URL config)"]
            PAYMENT["service/PaymentGateway.js\n(Razorpay)"]
        end

        subgraph UI["UI Layer"]
            SHARED["shared/ components\nNavbar · Footer · Modal\nClubCard · EventCard · Loading"]
            PRIVATE["private/ components\nLanding · Dashboard\nCreateEvent · ProfileCompletion"]
            MUI["MUI v5 + Emotion\nStyled-Components · SCSS"]
            ANIM["Framer Motion · AOS · Lenis"]
        end

        subgraph Ext["External SDKs"]
            RZPSDK["Razorpay checkout.js"]
            GOAUTH["Google OAuth redirect"]
            VERCEL_A["Vercel Analytics"]
            VERCEL_S["Vercel Speed Insights"]
        end
    end

    subgraph BackendAPI["Backend REST API (localhost:5000)"]
        AUTH_R["/auth — signin · signup · google · logout"]
        USER_R["/user — profile · complete · update · report"]
        CLUB_R["/clubs — list · dashboard · createevent"]
        EVENT_R["/events — list · create"]
        PAY_R["/payment — razorpay"]
    end

    subgraph Deploy["Infrastructure"]
        VITE_T["Vite 4 build\nPlugin React · SVGR · PWA"]
        VERCEL_D["Vercel CDN\nmilanhub.vercel.app"]
        DOCKER_D["Docker Compose\nLocal dev container"]
        SW["Service Worker\nWorkbox — CacheFirst\nFonts · Images"]
    end

    Boot --> Routing
    Routing --> Guard
    Guard --> SIGNIN & SIGNUP
    Routing --> UI
    UI --> State
    State --> API
    API -->|"HTTP + withCredentials cookie"| BackendAPI
    PAYMENT --> RZPSDK
    RZPSDK --> PAY_R
    GOAUTH --> AUTH_R
    VITE_T --> VERCEL_D
    VITE_T --> DOCKER_D
    VERCEL_D --> SW
```

---

## 2. Auth Data Flow

```mermaid
sequenceDiagram
    actor U as User
    participant Page as SignIn / SignUp Page
    participant Guard as Route Guard HOC
    participant Redux as Redux Store
    participant Cookie as Browser Cookies
    participant API as Backend /auth
    participant Google as Google OAuth

    U->>Page: Navigate to /auth/signin
    Page->>Guard: Evaluate access
    Guard->>Cookie: Read Token cookie
    Guard->>Redux: Read isLoggedIn

    alt Already authenticated
        Guard-->>U: Redirect to /
    else Not authenticated
        Guard-->>Page: Render form
    end

    Note over U,API: Email / Password flow
    U->>Page: Submit email + password
    Page->>API: POST /auth/signin (withCredentials: true)
    API-->>Cookie: Set Token cookie (httpOnly)
    API-->>Page: 200 + user data
    Page->>Redux: dispatch updateUserData()
    Page->>Redux: dispatch toggleUserLogin()
    Redux-->>Cookie: Persist state to localStorage
    Page-->>U: Redirect to /

    Note over U,Google: Google OAuth flow
    U->>Page: Click "Sign in with Google"
    Page->>API: GET /auth/google
    API-->>U: Redirect → Google consent screen
    U->>Google: Approve
    Google-->>API: OAuth callback with code
    API-->>Cookie: Set Token + OAuthLoginInitiated cookies
    API-->>U: Redirect to /
    Page->>API: GET /auth/login/success (detects OAuthLoginInitiated)
    API-->>Page: User data
    Page->>Redux: dispatch updateUserData() + toggleUserLogin()
    Page-->>U: Logged in

    Note over U,API: Logout
    U->>Page: Click logout
    Page->>API: GET /auth/logout (withCredentials: true)
    API-->>Cookie: Clear Token cookie
    Page->>Redux: dispatch resetUserData()
    Page-->>U: Redirect to /auth/signin
```

---

## 3. State Management Overview

```mermaid
graph LR
    subgraph Persistent["Persisted to localStorage"]
        SLICE["Redux — userSlice
        ───────────────
        isLoggedIn: boolean
        userName: string
        userType: individual | club
        email: string
        profileData: object"]
    end

    subgraph Memory["In-Memory only"]
        ZUS["Zustand — useAuth
        ───────────────
        isLoading: boolean
        toggleLoading()"]

        RQC["React Query Cache
        ───────────────
        clubs data
        dashboard data
        events list"]

        SWRC["SWR Cache
        ───────────────
        events list
        (invalidated after create)"]
    end

    subgraph Components["Components / Pages"]
        C1[Dashboard]
        C2[Profile]
        C3[Events]
        C4[Clubs]
        C5[Auth pages]
    end

    SLICE -- "selectUser()\nselectIsLoggedIn()" --> C1 & C2 & C5
    ZUS -- "isLoading" --> C5
    RQC -- "useQuery()" --> C1 & C4
    SWRC -- "useSWR()" --> C3

    C5 -- "dispatch(updateUserData)" --> SLICE
    C3 -- "mutate() on create" --> SWRC
```

---

## 4. Component Hierarchy

```mermaid
graph TD
    ENTRY["index.jsx
    Redux · PersistGate · Helmet"]

    APP["App.jsx
    QueryClient · LocalizationProvider
    Router · ToastContainer"]

    ENTRY --> APP

    APP --> NAV["Navbar (shared)"]
    APP --> FOOTER["Footer (shared)"]
    APP --> BT["BacktoTop (shared)"]
    APP --> PAGES["Pages"]

    PAGES --> HOME_P["Home
    ──────────
    Landing
    InfoBanner
    Marquee / Swiper"]

    PAGES --> AUTH_P["Auth Pages
    ──────────
    SignIn
    SignUp
    (lazy loaded)"]

    PAGES --> PROFILE_P["Profile
    ──────────
    User info
    ProfileCompletion
    ProfileUpdate"]

    PAGES --> CLUBS_P["Clubs
    ──────────
    ClubCard list
    Search / filter"]

    PAGES --> DASH_P["Dashboard
    ──────────
    ProfileSection
    TrackSection
    HostedEvents"]

    PAGES --> EVENTS_P["Events
    ──────────
    EventCard list
    CreateEvent modal"]

    PAGES --> SHOP_P["Shop ⚠️ WIP"]
    PAGES --> TREND_P["Trending"]
    PAGES --> ERR_P["Error 404"]
```

---

## 5. Build & Deployment Pipeline

```mermaid
graph LR
    DEV["Developer\nlocal machine"]

    subgraph LocalDev["Local Development"]
        VITE_DEV["Vite dev server\nlocalhost:3000\nnpm run dev"]
        DOCKER_L["Docker Compose\nnpm run docker-frontend"]
    end

    subgraph CodeQuality["Code Quality Gates"]
        HUSKY["Husky pre-commit
        lint-staged →
        ESLint --fix
        Prettier --write"]
        COMMITLINT["commitlint
        conventional commits"]
    end

    subgraph GHCI["GitHub Actions (CI)"]
        LINT_CI["ESLint check"]
        CYPRESS_CI["Cypress E2E tests"]
        PRTITLE["PR title lint"]
        LABELS["Auto-label PR"]
        ASSIGN["Auto-assign author"]
    end

    subgraph ProdDeploy["Production — Vercel"]
        BUILD["vite build"]
        CDN["Global CDN
        milanhub.vercel.app"]
        PWA_SW["Service Worker
        Workbox CacheFirst
        • Google Fonts (30 entries)
        • Images (60 entries)"]
        ANALYTICS["Vercel Analytics
        + Speed Insights"]
    end

    DEV --> LocalDev
    DEV -->|git commit| CodeQuality
    CodeQuality -->|git push| GHCI
    GHCI -->|merge to main| ProdDeploy
    BUILD --> CDN
    CDN --> PWA_SW
    CDN --> ANALYTICS
```

---

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 4 |
| Routing | React Router v6 |
| Global / Auth State | Redux Toolkit + redux-persist → localStorage |
| UI State | Zustand |
| Server / Cache State | TanStack React Query v5 + SWR |
| UI Components | MUI v5 (Emotion) + styled-components + SCSS |
| Forms & Validation | react-hook-form + Zod |
| HTTP Client | Axios — two layers: `integrations/` (newer) + `service/` (legacy) |
| Authentication | Cookie-based (httpOnly Token) + Google OAuth redirect |
| Payments | Razorpay (`checkout.js`) |
| Animations | Framer Motion + AOS + @studio-freight/lenis |
| PWA | vite-plugin-pwa + Workbox service worker |
| SEO | react-helmet-async |
| Analytics | Vercel Analytics + Speed Insights |
| E2E Testing | Cypress |
| Linting / Formatting | ESLint + Prettier + Husky + commitlint |
| Deployment | Vercel (production) + Docker Compose (local) |
