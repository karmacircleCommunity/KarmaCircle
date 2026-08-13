import React from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@app/store/useAuth.js";
import Button from "@components/buttons/globalbutton/Button.jsx";

const AuthButton = () => {
  const navigate = useNavigate();

  const { isLoading } = useAuthStore((state) => ({
    isLoading: state.isLoading,
  }));

  return (
    <>
      <p className="authpage_mediumchangebtn">
        {window.location.pathname.includes("signup") ? (
          <>
            Already have an account?{" "}
            <span
              onClick={() => {
                navigate("/auth/login");
              }}
            >
              Login
            </span>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <span
              onClick={() => {
                navigate("/auth/signup");
              }}
            >
              Sign Up
            </span>
          </>
        )}
      </p>

      <Button type="submit" cypressfield="loginbutton" isLoading={isLoading}>
        {window.location.pathname.includes("signup") ? "Sign Up" : "Sign In"}
      </Button>
    </>
  );
};

export default AuthButton;
