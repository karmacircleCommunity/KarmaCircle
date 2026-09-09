# 12 — Feedback: toasts, loading, validation, offline

## Toasts

### The API

[apps/web/src/utils/Toasts.ts](../../../apps/web/src/utils/Toasts.ts), on top of react-toastify.

```ts
showSuccessToast(message?: string): void
showErrorToast(message?: string): void
showWarningToast(message?: string): void
showInfoToast(message?: string): void
```

**Use these for any API-triggered feedback. Never call `toast.success` / `toast.error` directly.**

### Behavior

| Helper | Offline | Empty message | Extra option |
| --- | --- | --- | --- |
| `showSuccessToast` | returns silently | returns silently | — |
| `showErrorToast` | returns silently | falls back to `"Something went wrong. Please try again."` | `pauseOnHover: true` |
| `showWarningToast` | returns silently | returns silently | `pauseOnHover: true` |
| `showInfoToast` | returns silently | returns silently | — |

The offline check is `checkInternetConnection()` ([utils/CheckInternetConnection.ts](../../../apps/web/src/utils/CheckInternetConnection.ts)).

An empty toast is a bubble that appears, says nothing and leaves, which is exactly what an API response with no `message` field used to produce.
Success says nothing instead.
An error the user cannot see is worse than a vague one, so error alone falls back to generic copy.

`showWarningToast` and `showInfoToast` have **no API call site yet**.
They exist so a future needs-attention-but-not-failed case does not reintroduce a raw `toast.warning(...)` and with it react-toastify's stock look.

### `BASE_OPTIONS`

```ts
position: "top-center"
autoClose: 2000
hideProgressBar: false
closeOnClick: false
pauseOnHover: false
draggable: false
closeButton: false
```

Position and timing are the only per-call concerns.

### Theming

**All visual theming comes from react-toastify's own CSS custom properties**, overridden once in `index.css` under a `:root:root` selector.
There is no per-toast styling left in `Toasts.ts`.
The previous version carried `bodyStyle`/`style` hacks that fought react-toastify's unlayered CSS and mostly lost, which is why a toast used to render in the library's stock green and white regardless of what was passed.

```css
:root:root {
  --toastify-color-success:          var(--color-success);
  --toastify-color-error:            var(--color-error);
  --toastify-color-warning:          var(--color-warning);
  --toastify-color-info:             var(--color-info);
  --toastify-icon-color-success:     var(--color-success);
  --toastify-icon-color-error:       var(--color-error);
  --toastify-icon-color-warning:     var(--color-warning);
  --toastify-icon-color-info:        var(--color-info);
  --toastify-text-color-light:       var(--color-ink);
  --toastify-toast-background:       #ffffff;
  --toastify-toast-bd-radius:        var(--radius-10px);
  --toastify-toast-padding:          1rem;
  --toastify-toast-shadow:           0 18px 38px -16px color-mix(in srgb, var(--color-brand-secondary) 35%, transparent);
  --toastify-font-family:            var(--font-outfit);
  --toastify-color-progress-success: var(--color-success);
  --toastify-color-progress-error:   var(--color-error);
  --toastify-color-progress-warning: var(--color-warning);
  --toastify-color-progress-info:    var(--color-info);
}
```

So: white ground, 10px radius, 16px padding, Outfit, ink text, a warm brand-secondary glow, and the four semantic colors on both icon and progress bar.

**`:root:root`, not `:root`, is deliberate.**
`ReactToastify.css` declares its own unlayered `:root { --toastify-* }` block.
Repeating the pseudo-class doubles this override's specificity from (0,1,0,0) to (0,2,0,0) without leaving `:root`, which is what makes it win regardless of which stylesheet's import lands later in Vite's bundle.
Relying on source order alone is not safe here; see [04-spacing-layout.md](./04-spacing-layout.md#the-cascade-rule).

`"react-toastify/dist/ReactToastify.css"` is imported from `Toasts.ts` (and redundantly from `Footer.tsx`).

## Loading

| Surface | Implementation |
| --- | --- |
| Page / section | `<Loading />` — 64px, `border-4`, `border-brand!`, `border-r-transparent`, `animate-spin`, `role="status"` + `sr-only` text |
| Button | `Button`'s `isLoading` prop — a `react-spinners` `ClipLoader`, `color="#000000"`, `size={25}`, replacing children |
| Global flag | A Zustand `isLoading` boolean, the app's one piece of ephemeral global UI state |
| `.loader` in `index.css` | A 30px conic-gradient + radial-mask spinner, `animation: l13 1s infinite linear`. Legacy; prefer `<Loading />` |

Loading indicators are **not** `motion-safe:`-gated. They are status, not decoration.

## Validation errors

- Inline message color is `text-error` (`#a8402f`). Never `text-red-*`.
- The required asterisk is `RequiredMark` / `SetupFieldLabel`'s span: `ml-0.5 align-top text-xs text-error`, `aria-hidden`.
- Password strength colors come from `features/authentication/utils/passwordStrength.ts`, already migrated onto the semantic tokens.
- **A non-empty `errors` object must block the API call.** Several existing forms compute errors and call the API anyway; that is recorded in `known-issues.md` and must not be copied.

The migration onto `text-error` / `text-warning` covered `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `passwordStrength.ts`, `AuthFieldKit.tsx` and the organization setup wizard.
It did **not** cover the profile and event forms; see [14-drift-register.md](./14-drift-register.md#d2).

## Offline

`checkInternetConnection()` gates every toast.
`Button` additionally forks on `navigator.onLine`: with `to` set and the browser offline it renders a plain `<button>` rather than a `<Link>`, so navigation is inert rather than dead-ending.

## Status codes

Compare against `STATUSCODE` from [statics/Constants.ts](../../../apps/web/src/statics/Constants.ts) (`STATUSCODE.OK`), never a bare `200`.

## Empty and error states

`/events` and `/organizations` render a filtered-to-nothing state through the toolbar's `summary` count plus a page-level empty block.
`Error404.tsx` is the reference for a full-page terminal state: eyebrow, heading, lead, and a single pill `Button` (`rounded-full px-6 py-3 font-poppins text-body`).
