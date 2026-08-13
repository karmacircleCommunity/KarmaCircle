import type { ComponentType } from "react";
import { selectIsLoggedIn } from "@app/store/slices/userSlice.js";
import Cookies from "js-cookie";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * Route guard HOC applied to `SignIn`/`SignUp` in `routesConfig.jsx`.
 * Guard condition: both the `Token` cookie and Redux's `isLoggedIn` must
 * be truthy to redirect away — either alone renders the wrapped page
 * normally. "Pattern 2" of the three "is the user logged in" checks
 * cataloged in `docs/specs/state-management.md`.
 */
const DonotRenderWhenLoggedIn = <P extends object>(
  Component: ComponentType<P>,
) => {
  const WrappedComponent = (props: P) => {
    const token = Cookies.get("Token");
    const isLoggedIn = useSelector(selectIsLoggedIn);

    if (token && isLoggedIn) {
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
