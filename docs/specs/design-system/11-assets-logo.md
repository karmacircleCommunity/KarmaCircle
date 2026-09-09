# 11 — Assets, logo, icons

## The logo

**There is no logo image file used as the app's mark.**
The logo is composed in JSX, everywhere, from two elements:

1. A **brand dot**: `rounded-full bg-brand`, `aria-hidden="true"`.
2. The **wordmark** "KarmaCircle" in `font-outfit`, `font-medium`, `tracking-tight`, `leading-none`.

The dot is the app's one recurring mark. It reappears as the `animate-ping` dot on `OpenSource.tsx`'s "Open source" badge and as the trailing dot on the Navbar's draft-organization row.

| Placement | Dot | Wordmark | Color |
| --- | --- | --- | --- |
| `Navbar` | `size-2` (8px), `group-hover:scale-125` | `text-xl` (20px) | `text-brand-secondary`, `group-hover:text-brand` |
| `Footer` | `size-2` (8px), static | `text-lg sm:text-xl` (18/20px) | `text-white` |
| `SplitPanelLayout`, dark panel | `size-1.5` (6px) | `text-sm` (14px) | `text-white/90` |
| `SplitPanelLayout`, mobile form | `size-1.5` (6px) | `text-sm` (14px) | `text-ink` |

Gap is always `gap-2` (8px). The wrapper is always a `<Link to="/">` with `no-underline`.

**The dot never gets its own hover.** An 8px hit target is not a hover affordance; the wordmark next to it is. The whole link is the `group`.

## Favicons and app icons

| File | Referenced from | Notes |
| --- | --- | --- |
| `public/favicon.ico` | `index.html` `<link rel="icon">` | |
| `public/logo192.png` | `index.html` `<link rel="apple-touch-icon">` | **Missing from `public/`.** The file does not exist. |
| `src/assets/pictures/solidarity.png` | `index.html` `<link rel="shortcut icon" href="./src/assets/...">` | A source-tree path in a static tag; it will not resolve in the production build. |
| `public/assets/icons/icon-{48,72,96,128,144,152,192,384,512}x{...}.png` | `public/manifest.json` | Nine sizes, each `"purpose": "maskable any"` |

`manifest.json`: `short_name`/`name` "KarmaCircle", `start_url` `"./"`, `display` `"standalone"`, `theme_color` `#000000`, `background_color` `#ffffff`.

**Chrome color drift.** `index.html` sets `theme-color`, `msapplication-navbutton-color`, `msapplication-TileColor` and `apple-mobile-web-app-status-bar-style` to `#ff5b31`, the pre-rebrand orange, while `manifest.json` sets `theme_color` to `#000000`.
Neither is the brand.
The correct value for all of them is `#a8623e`.
See [14-drift-register.md](./14-drift-register.md#d6).

## Social / SEO imagery

`og:image` and `twitter:image` both point at a **raw GitHub URL**:
`https://raw.githubusercontent.com/karmacircleCommunity/KarmaCircle/main/apps/web/src/assets/pictures/Banner/KarmaCircleSEO.svg`.

Two problems worth knowing before touching it: an SVG is not reliably rendered by social-card scrapers, and hotlinking `raw.githubusercontent.com` couples the card to the default branch.

## Asset inventory

All under [apps/web/src/assets/](../../../apps/web/src/assets/), imported through the `@assets/` alias.

### `pictures/Banner/`
- `KarmaCircleSEO.svg` — the OG/Twitter card.
- `Vector.png`
- `organizationbanner.jpg` — the old single shared organization banner. Replaced by per-organization covers; kept only if still referenced.

### `pictures/Navbar/`
- `profilePlaceholderImage.png` — the fallback avatar. Rendered at `size-7.5 rounded-full` in `Navbar`.
- `ngo.png`

### `pictures/authpages/`
- `signup-panel-waves.jpg` — **the `SplitPanelLayout` left-panel art**, the one asset the whole focused-flow shell depends on. Rendered `scale-125 object-cover blur-2xl` under a gradient scrim, so it is atmosphere, not an image anyone reads.
- `authbanner.png`, `authbannerimg.webp` — legacy.

### `pictures/organizations/` — 12 cover photos
`aarogya-volunteers`, `casa-abierta`, `clearwell-foundation`, `green-corridor-collective`, `himal-light-collective`, `mercy-paws-lagos`, `north-star-shelter`, `pawsitive-pune`, `sandhya-elder-care`, `sunrise-youth-club`, `tanaka-skills-lab`, `ubuntu-learning-trust`. All `.jpg`.

### `pictures/events/` — 12 cover photos
`adoption-sunday`, `borewell-maintenance-webinar`, `free-vet-clinic-mushin`, `homework-club-new-term`, `library-shelving-weekend`, `mangrove-planting-day`, `monsoon-health-camp-ward-four`, `morning-movement-class`, `night-kitchen-shift`, `night-shift-induction`, `solar-lamp-install`, `welding-intake-day`. All `.jpg`.

### `pictures/drives/` — 5 landing-rail photos
`monsoon-health-camp`, `school-library`, `solar-lamps`, `street-dog-van`, `winter-blankets`. All `.jpg`.

### `avatars/` — 5 contributor photos
`gh-56752104`, `gh-71691473`, `gh-72697074`, `gh-72851613`, `gh-94097778`. Named by GitHub user id.

### Others
- `pictures/ProfilePicture.png`
- `pictures/solidarity.png`
- `pictures/readme/KarmaCircleBanner.png`
- `svg/Bell.svg`

Covers stand in for the image a real organization or event would upload. They are seeded content, not decoration; a card with no cover falls back to the accent-gradient monogram band, never to a shared stock banner.

## Image conventions

| Rule | Value |
| --- | --- |
| Aspect ratio for every cover | `aspect-16/9` |
| Fit | `object-cover` on a `size-full` image inside an `overflow-hidden` box |
| Loading | `loading="lazy" decoding="async"` on every card cover |
| Placeholder ground | `bg-brand-secondary/10` behind the image, so a slow load is not a white hole |
| Hover | `motion-safe:group-hover:scale-105`, 500ms `ease-out` |
| Alt text | A real `coverAlt` per record. Decorative images get `alt=""` plus `pointer-events-none` |
| Text over an image | Always on a scrim. See [10-patterns.md](./10-patterns.md#photo-scrim--label) |
| Responsive | `img { max-width: 100% }` is not globally set; rely on `size-full` inside a sized box |

## Icons

`react-icons` only. There is no in-house icon set and no SVG sprite.

| Pack | Imports | Use |
| --- | --- | --- |
| `react-icons/fi` (Feather) | **23** | **The house set.** Use this for anything new |
| `react-icons/fa6` | 5 | Brand marks (GitHub, X, LinkedIn), chevrons |
| `react-icons/rx` | 3 | `RxCaretDown`, `RxCross2` in `Navbar` |
| `react-icons/md` | 3 | `MdVerified` |
| `react-icons/io`, `io5`, `fa`, `tb`, `ri`, `pi`, `gi`, `fc`, `ci`, `bs`, `bi` | 1-2 each | Legacy one-offs. Do not add to these |

Sizing is always a Tailwind `size-*`, never a `size` prop: `size-3.5` (14px) in meta rows, `size-4` (16px) for the verified tick and clear icon, `size-4.5` (18px) for the search icon, `size-5` (20px) for the card arrow, `size-6.25` (25px) for the nav caret, `size-7.5` (30px) for the hamburger and avatar.

Decorative icons carry `aria-hidden="true"`.
An icon that carries meaning carries `role="img"` and an `aria-label` (the verified tick is the reference).
Icons inside a text row carry `shrink-0`.
