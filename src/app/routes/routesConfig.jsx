import Home from "@features/landing-home/pages/Home.jsx";
import {
  Clubs,
  Dashboard,
  Error404,
  Events,
  Profile,
  Shop,
} from "./route.js";
import Trending from "@features/donate-shop-trending/pages/Trending.jsx";
import { lazy } from "react";
import { default as DonotRenderWhenLoggedIn } from "@features/authentication/components/DonotRenderWhenLoggedIn.jsx";

const SignIn = lazy(() => import("@features/authentication/pages/SignIn.jsx"));
const SignUp = lazy(() => import("@features/authentication/pages/SignUp.jsx"));

const ProtectedSignIn = DonotRenderWhenLoggedIn(SignIn);
const ProtectedSignUp = DonotRenderWhenLoggedIn(SignUp);

const routesConfig = [
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
