import { lazy } from "react";
import type { JSX } from "react";
import Home from "@features/landing-home/pages/Home";
import { Clubs, Dashboard, Error404, Events, Profile, Shop } from "./route";
import Trending from "@features/donate-shop-trending/pages/Trending";
import DonotRenderWhenLoggedIn from "@features/authentication/components/DonotRenderWhenLoggedIn";

const SignIn = lazy(() => import("@features/authentication/pages/SignIn"));
const SignUp = lazy(() => import("@features/authentication/pages/SignUp"));

const ProtectedSignIn = DonotRenderWhenLoggedIn(SignIn);
const ProtectedSignUp = DonotRenderWhenLoggedIn(SignUp);

export interface RouteConfigEntry {
  path: string;
  element: JSX.Element;
}

const routesConfig: RouteConfigEntry[] = [
  { path: "/", element: <Home /> },
  {
    path: "/auth/signup",
    element: <ProtectedSignUp />,
  },
  {
    path: "/auth/signin",
    element: <ProtectedSignIn />,
  },
  { path: "/user/:userName", element: <Profile /> },
  { path: "/clubs", element: <Clubs /> },
  { path: "/club/:userName", element: <Profile /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/events", element: <Events /> },
  { path: "/shop", element: <Shop /> },
  { path: "/trending", element: <Trending /> },
  { path: "*", element: <Error404 /> },
];

export default routesConfig;
