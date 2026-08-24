import { lazy } from "react";
import type { JSX } from "react";
import Home from "@features/landing-home/pages/Home";
import { Organizations, Dashboard, Error404, Events, Profile, Shop } from "./route";
import Trending from "@features/donate-shop-trending/pages/Trending";
import DonotRenderWhenLoggedIn from "@features/authentication/components/DonotRenderWhenLoggedIn";

// One unified email-first flow (features/authentication/pages/Auth.tsx)
// backs both routes below — which of "sign in"/"sign up" the visitor sees
// is decided at runtime by a live duplicate-email check, not by which of
// these two paths they arrived on. Both are kept (rather than collapsing
// to one canonical route) so existing links/bookmarks to either still
// work.
const Auth = lazy(() => import("@features/authentication/pages/Auth"));

const ProtectedAuth = DonotRenderWhenLoggedIn(Auth);

export interface RouteConfigEntry {
  path: string;
  element: JSX.Element;
}

const routesConfig: RouteConfigEntry[] = [
  { path: "/", element: <Home /> },
  {
    path: "/auth/signup",
    element: <ProtectedAuth />,
  },
  {
    path: "/auth/signin",
    element: <ProtectedAuth />,
  },
  { path: "/user/:userName", element: <Profile /> },
  { path: "/organizations", element: <Organizations /> },
  { path: "/organization/:userName", element: <Profile /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/events", element: <Events /> },
  { path: "/shop", element: <Shop /> },
  { path: "/trending", element: <Trending /> },
  { path: "*", element: <Error404 /> },
];

export default routesConfig;
