import type { ComponentType } from "react";
import { useRef } from "react";
import { selectIsLoggedIn } from "@app/store/slices/userSlice";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * Route guard HOC applied to the unified `Auth` page (both `/auth/signin`
 * and `/auth/signup`) in `routesConfig.tsx`.
 * Guard condition: Redux's `isLoggedIn` flag — the single source of truth
 * for auth state (see `docs/specs/state-management.md`). Previously also
 * required `Cookies.get("Token")`, which can never be true for a
 * Google-OAuth session (that `Token` cookie is `httpOnly`, so it's
 * invisible to client JS by design) — a Google-signed-in user would land
 * back on this page instead of being redirected to `/`.
 *
 * Only the value of `isLoggedIn` *at mount* decides the redirect — captured
 * once in `wasLoggedInOnMount` rather than read live on every render. A
 * signup/login succeeding while this page is already mounted also flips
 * `isLoggedIn` to `true`, and `useAuth.ts` already calls its own
 * `navigate()` for that exact transition (to "/" or "/organization/setup").
 * Reacting to the live value here raced that call: React (or react-redux's
 * `useSyncExternalStore` sync-rerender path, depending on timing) could
 * render this guard's `<Navigate to="/">` before that explicit navigate,
 * and `<Navigate>` fires its own redirect from an unguarded `useEffect` —
 * so a few milliseconds later it overwrote the intended destination with
 * "/", regardless of which had pushed history first. See
 * `docs/specs/authentication.md` for the full failure mode this replaced.
 */
const DonotRenderWhenLoggedIn = <P extends object>(
  Component: ComponentType<P>,
) => {
  const WrappedComponent = (props: P) => {
    const isLoggedIn = useSelector(selectIsLoggedIn);
    const wasLoggedInOnMount = useRef(isLoggedIn);

    if (wasLoggedInOnMount.current) {
      return <Navigate to={`/`} replace />;
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `WithUserLoggedInRoute(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default DonotRenderWhenLoggedIn;
