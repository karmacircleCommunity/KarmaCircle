import type { ComponentType } from "react";
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
 */
const DonotRenderWhenLoggedIn = <P extends object>(
  Component: ComponentType<P>,
) => {
  const WrappedComponent = (props: P) => {
    const isLoggedIn = useSelector(selectIsLoggedIn);

    if (isLoggedIn) {
      return <Navigate to={`/`} />;
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `WithUserLoggedInRoute(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default DonotRenderWhenLoggedIn;
