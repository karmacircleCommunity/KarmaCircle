import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectIsLoggedIn } from "@app/store/slices/userSlice";

const RequireSignIn = ({ children }: { children: ReactNode }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? children : <Navigate to="/auth/signin" replace />;
};

export default RequireSignIn;
