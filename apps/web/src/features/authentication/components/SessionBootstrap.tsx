import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "@app/store/slices/userSlice";
import AppLoading from "@components/AppLoading";
import { restoreSession } from "../utils/restoreSession";

/** Verify persisted login before navbar or auth-route guards can trust it. */
const SessionBootstrap = ({ children }: { children: ReactNode }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const [checking, setChecking] = useState(isLoggedIn);

  useEffect(() => {
    let active = true;
    void restoreSession().finally(() => {
      if (active) setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (checking) return <AppLoading />;
  return children;
};

export default SessionBootstrap;
