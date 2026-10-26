# Performance and SEO audit

Audit date: 2026-10-26.
Status: initial RCA and remediation backlog; application fixes have not started.
Scope: supplied homepage Network screenshot, current frontend source/configuration, cached development dependencies, and a fresh production build.

## Conclusion

The screenshot captures the Vite development server, not a production performance baseline.
Development module loading and large icon-family prebundles explain a substantial part of the apparent bloat.
There are also confirmed production optimization gaps and SEO configuration defects worth fixing.
Neither a production load time nor a Lighthouse score can be inferred from this screenshot.
Performance, search indexing, and social sharing are separate concerns; a good Lighthouse SEO score alone would not prove healthy indexing.

## Subsequent changes

Later on 2026-10-26, the sparse `Profile.tsx` page and `/user/:userName` route were removed.
Individual navigation now opens the kept `/user/setup` editor directly.
Original measurements below remain the pre-removal baseline; SEO-04 references to individual public profiles are historical.
The removal build measures main JS 941.47 kB / 297.18 kB gzip and CSS 140.59 kB / 22.11 kB gzip.
These build sizes do not close the remaining performance or SEO findings.

## Evidence and limits

- Supplied screenshot: `localhost:3000/`, Fast 4G, 188 requests, 31.5 MB transferred, 64.8 MB resources, Finish 32.68 seconds.
- Visible `.tsx`/`.ts` requests and `react-icons_tb.js?v=...` identify development module delivery.
- `Disable cache` is unchecked; visible responses include 304 and memory-cache entries, despite the reported hard refresh.
- `resources` is loaded/uncompressed resource size; `transferred` measures network traffic, so 64.8 MB is not 64.8 MB downloaded.
- `Finish` is the last recorded request's completion, not when the page became useful, LCP, or a Core Web Vitals result.
- Command run successfully: `pnpm --filter karmacircle-frontend build` using Vite 8.2.1.
- Build transformed 1,190 modules and warned about a minified chunk over 500 kB.
- Measurements and file inventory: [2026-10-26-build-inventory.json](../audits/evidence/2026-10-26-build-inventory.json).
- The working tree already contained unrelated edits, including session bootstrap changes; measurements describe this checkout, not an isolated deployed commit.
- No browser was opened, no localhost session was exercised, and no Lighthouse, HAR, deployed response-header, Search Console, or field-data audit was run.
- Screenshot evidence establishes the reported symptom; exact request attribution and the 32.68-second critical path remain unverified without a HAR/performance trace.

### Production build baseline

Vite reports decimal kB; gzip values are build estimates, not observed CDN transfers.
These rows are not a total homepage transfer budget.
An emitted asset is not necessarily fetched on the homepage.

| Output | Uncompressed kB | Vite gzip kB | Interpretation |
|---|---:|---:|---|
| Main JavaScript | 951.12 | 299.53 | Large initial entry chunk |
| Main CSS | 142.50 | 22.39 | Shared stylesheet |
| IndiaCities JavaScript | 111.95 | 46.93 | Already dynamically imported; do not count as initial homepage traffic without a trace |
| Auth JavaScript | 14.36 | 3.79 | Already split from main route bundle |
| HeroScene JavaScript | 1.09 | 0.63 | Small, lazy CSS decoration; no longer a Three.js canvas |

The largest emitted raster assets are the signup panel (345.45 kB) and shared profile placeholder (211.66 kB).
Five drive images total approximately 353.12 kB; four homepage avatars total approximately 131.83 kB.
Local source images are only a few MB in aggregate, so they do not explain a 64.8 MB resource total by themselves.

## Root causes and remediation backlog

Priorities: P1 = address in the first optimization/SEO pass; P2 = follow-up improvement or measurement-dependent change.
Every item below is open.
No item is marked fixed based on source inspection alone.

### PERF-01 - Development icon-family prebundles inflate throttled reloads (P1)

**Evidence:** `apps/web/node_modules/.vite/deps/*.js` totals 34,398,991 bytes; `react-icons_*.js` accounts for 30,455,006 bytes, excluding source maps.
The largest families are `gi` (7,114,074 bytes), `pi` (6,228,482), and `tb` (4,457,673).
`Navbar.tsx` imports `GiHamburgerMenu` from `react-icons/gi`; `TrackSection.tsx` imports `TbExternalLink` from `react-icons/tb`, which is also visible in the screenshot.

**Cause:** development prebundling serves whole family modules with many exports; named icon imports do not imply a tiny development response.
Development native-module imports also create request chains under throttling.
The cache inventory strongly supports this explanation but cannot reconcile every byte in the screenshot or prove that every cached family was fetched on `/`.
Production tree-shaking changes this behavior, so the 30.46 MB must not be reported as production icon cost.

**Fix later:** standardize live icons on a small set of families or directly scoped SVG components, remove unused import chains, and first establish a production baseline.
Treat any dev-server tuning separately from production optimization.
**Acceptance:** a cold dev HAR attributes transferred and resource bytes by URL; selected icons and menu behavior remain correct; production bundle does not regress.

### PERF-02 - Unrelated routes and providers are eager (P1)

**Evidence:** `routesConfig.tsx` statically imports profile, setup, dashboard, organization, and event pages through `route.ts`.
Only auth/password routes are lazy; `Landing.tsx` separately lazy-loads the small HeroScene.
`App.tsx` loads MUI date-picker localization globally and mounts an unused React Query provider.
The production main chunk is 951.12 kB minified / 299.53 kB gzip.

**Cause:** visiting `/` requires loading code used by other routes, and global providers expand the shared dependency graph.
The build establishes the aggregate size; a module attribution report is still needed before claiming exact savings per library.

**Fix later:** lazy-load route pages directly, keep a small public shell, scope event-only date-picker providers to their consumers, and remove unused providers after checking consumers.
Prefer real route boundaries over moving everything into one vendor chunk, which may still be requested immediately.
**Acceptance:** homepage Network trace excludes setup/dashboard/event-editor code until navigation; all deep links and route fallbacks work; measured initial JS decreases from this baseline.

### PERF-03 - Five global font stylesheet requests (P2)

**Evidence:** `index.html` requests Montserrat, Ubuntu, Open Sans, Poppins, and Outfit on every route, including broad weight ranges.
`index.css` defines shared Montserrat/Poppins/Outfit tokens and a system fallback stack.

**Cause:** external stylesheets introduce rendering dependencies and font discovery work.
Browsers download font binaries according to actual use; five stylesheet links do not prove every requested weight downloads.

**Fix later:** inventory rendered font usage, remove unused families/weights, consolidate requests or serve subsetted WOFF2 locally, and preserve appropriate fallback metrics and `font-display` behavior.
Do not preload every weight.
**Acceptance:** record actual font/CSS requests and bytes on public routes, verify intended typography, and compare LCP and layout shifts.

### PERF-04 - Public rendering can wait on a returning user's session check (P1)

**Evidence:** current `index.tsx` wraps the entire app with `SessionBootstrap` inside `PersistGate`.
`SessionBootstrap.tsx` renders `AppLoading` while a persisted logged-in session is being checked.
`restoreSession.ts` awaits the profile request; `Fetcher.ts` sets no per-request timeout.
Fresh logged-out users do not wait for this request.

**Cause:** public marketing content is coupled to authentication verification for returning signed-in users.
A slow or stalled request can prolong the loading state; its contribution to the supplied screenshot has not been measured.
This flow includes pre-existing uncommitted work and needs evaluation against the final agreed session behavior.

**Fix later:** reproduce with persisted login plus slow/failing profile requests, then allow public content to render while session-dependent controls remain safely pending.
Bound failure/recovery behavior without reintroducing stale authenticated UI.
**Acceptance:** cold logged-out, valid persisted login, expired login, offline, and stalled API cases have deterministic behavior; public content is not indefinitely blocked.

### PERF-05 - Hero reveal delays visibility; continuous motion needs profiling (P2)

**Evidence:** `Landing.tsx` sets hero reveal elements to opacity zero, then animates them with a 0.1-second delay, 0.9-second duration, and stagger.
`SmoothScroll.tsx` integrates Lenis/GSAP globally on fine pointers, and `DrivesRail.tsx` uses a ticker for its marquee.
Reduced-motion and coarse-pointer mitigations already exist in relevant paths.

**Cause:** critical text visibility depends on animation; continuing animation can consume main-thread time.
An LCP or INP regression is a hypothesis until measured, not a confirmed Lighthouse failure.

**Fix later:** profile first; keep critical hero content immediately readable and pause nonessential work when offscreen if traces justify it.
**Acceptance:** capture mobile/desktop traces, identify the real LCP element, compare visibility timing and long tasks, and retain reduced-motion support.

### PERF-06 - Raster delivery has remaining optimization opportunities (P2)

**Evidence:** emitted signup JPEG is 345.45 kB and profile placeholder PNG is 211.66 kB.
Homepage drive images already use `loading="lazy"` and `decoding="async"`, with aspect-ratio wrappers, but no responsive `srcSet` is provided there.
Repeated marquee cards reuse the same URLs; duplicated markup does not mean duplicate full image downloads.

**Fix later:** inspect rendered sizes and actual request timing, generate appropriate AVIF/WebP/responsive variants, and retain layout space and useful alt text.
**Acceptance:** compare transferred image bytes at mobile/desktop sizes and cold/warm visits; confirm no visible degradation or new layout shifts.

### SEO-01 - Distinct public pages canonicalize to homepage (P1)

**Evidence:** `ComponentHelmet.tsx` emits `href="/"` for both organizations and events.
`DetailedEvent.tsx` also mounts its generic Events branch, inheriting homepage canonical and generic event metadata.

**Impact:** independent public pages send incorrect consolidation signals, potentially weakening their own indexing.
A relative canonical is not inherently invalid; the incorrect destination is the primary defect.

**Fix later:** use one absolute self-canonical per intended indexable route on the agreed production origin, with unique title/description for details.
**Acceptance:** inspect raw HTML and rendered head for each route; no conflicting canonical; Search Console inspection confirms intended URL signals when available.

### SEO-02 - Sitemaps advertise obsolete routes (P1)

**Evidence:** `public/sitemap.xml` lists `/clubs`, `/shop`, `/user/login`, `/clubs/register`, `/contact`, and shop categories absent from the current route table.
It duplicates `/shop/decors`, omits `/organizations`, and carries 2023 timestamps.
`sitemap.txt` disagrees with XML and contains additional obsolete routes.
`robots.txt` permits crawling but does not advertise a sitemap.
Missing a robots sitemap line alone does not prevent discovery or indexing.

**Fix later:** publish one consistent sitemap source containing only canonical, public, indexable URLs; use truthful modification times; decide redirects for legacy URLs; advertise the sitemap.
Do not add account setup or reset-token URLs.
**Acceptance:** parse sitemap successfully; no duplicates; each listed URL has intended content, canonical, and success status on the deployed site.

### SEO-03 - Catch-all success responses risk soft 404s (P1)

**Evidence:** `apps/web/vercel.json` rewrites extensionless paths to `/` with status 200, including unknown paths.
`Error404.tsx` changes visible content and metadata but has no `noindex` directive.

**Impact:** hosting configuration serves the application shell successfully for invalid URLs; Google may classify the rendered error page as a soft 404.
Actual deployed responses and indexing outcomes have not been checked.

**Fix later:** keep legitimate SPA deep links working while returning meaningful 404/410 responses for missing content; evaluate hosting/server rendering support and add appropriate rendered indexing directives where needed.
**Acceptance:** known routes remain reachable; unknown routes and removed records produce intended status/indexing behavior; verify direct loads and client navigation.

### SEO-04 - Public detail metadata and initial HTML are generic (P1)

**Evidence:** `index.html` contains an empty root and static site-wide metadata; public content and Helmet changes require JavaScript.
`OrganizationProfile.tsx` and routed individual `Profile.tsx` set no page-specific Helmet metadata.
Event detail reuses generic Events metadata.
Static OG/Twitter URL/title/description remain homepage values; the social image points to a GitHub-hosted SVG.

**Impact:** detail pages lack distinct search/share descriptions, and clients that do not render JavaScript receive the shared shell.
Google can render JavaScript; a SPA is not automatically unindexable, and SSR is not automatically required.
The SVG preview's compatibility and current availability remain unverified.

**Fix later:** define per-route metadata and indexability, choose prerendering/server rendering where public content and sharing need it, and use a verified, first-party social preview image supported by target platforms.
**Acceptance:** direct requests expose appropriate public metadata/content for the chosen rendering strategy; verify representative social previews and rendered Google inspection.

### SEO-05 - Indexability policy is missing for utility/private routes (P2)

**Evidence:** `index.html` defaults to `index, follow` globally; no route-level `noindex` was found under `apps/web/src`.
Auth/password/reset/setup routes therefore inherit this policy; reset pages even self-canonicalize the token-bearing path in `ResetPassword.tsx`.
Discovery or actual indexing of these URLs has not been established.

**Fix later:** explicitly identify public indexable routes versus auth, account utilities, and error states, then implement consistent per-route directives and sitemap exclusions.
Do not treat robots.txt disallow rules as an equivalent to noindex or as access control.
**Acceptance:** response/rendered directives match the route matrix; public records stay indexable; utility/token/error pages are excluded appropriately.

## Work order and closure rules

1. Capture a production-build baseline, then tackle PERF-02 and verify PERF-04 before attributing all delay to asset size.
2. Fix SEO-01, SEO-02, and SEO-03 together with a route/indexability matrix, so canonical, sitemap, and status signals agree.
3. Fix SEO-04/05 with a deliberate public-content rendering and sharing strategy.
4. Optimize fonts, images, icons, and motion using measured bytes and rendering costs.
5. Add ongoing build-size and public-route SEO checks after budgets and canonical origin are agreed.

An issue closes only when its acceptance checks run and evidence is linked here, including remaining limitations.
Build success alone does not close a performance or indexing issue.
No application code, deployment configuration, or metadata was changed during this documentation pass.

## Next measurement protocol

Use an isolated production build preview or the confirmed deployment, not `pnpm dev`, for production conclusions.
Do not attach automated tests to the developer's real app/database; follow [testing.md](./testing.md) when implementing checks.

1. Record commit/dirty state, URL, browser/version, viewport, network profile values, CPU throttle, login state, and service-worker/cache state.
2. Capture homepage cold and warm Network HARs, then repeat for directories and representative valid/missing detail routes.
3. Inspect largest transferred resources, module initiators, critical request chains, compression, cache-control, and external requests.
4. Run Lighthouse mobile and desktop at least three times per target; retain raw reports and compare medians under identical settings.
5. Record Performance, Accessibility, Best Practices, and SEO separately, plus FCP, LCP, CLS, TBT, and request/transfer totals.
6. Use interaction traces or field data for INP; Lighthouse TBT is not a measured substitute for field INP.
7. Validate response codes, canonical, robots directives, title/description, social metadata, crawlable links, and sitemap coverage independently of the Lighthouse score.
8. Check available Search Console/CrUX or Speed Insights field data before claiming real-user impact.

Reference experience targets: LCP <= 2.5 seconds, INP <= 200 ms, CLS <= 0.1, evaluated at the 75th percentile of real visits.
These are targets, not current measurements or guaranteed results.
Production compression/caching, real API latency, exact font traffic, rendered layout shifts, and current Lighthouse scores remain open measurements.

## Primary references

- [Vite: why development and production differ](https://vite.dev/guide/why.html).
- [Chrome DevTools Network: transferred and loaded resource sizes](https://developer.chrome.com/docs/devtools/network/reference/).
- [Google Search: JavaScript SEO, rendering, metadata, and status handling](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- [Google Search: canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- [Web Vitals: metrics and experience thresholds](https://web.dev/articles/vitals).
