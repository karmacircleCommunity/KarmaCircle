import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { Link } from "react-router-dom";
import rightabstract from "@assets/pictures/authpages/authbanner.png";
import { Button, Navbar } from "@components";
import { useAuth } from "@features/authentication/hooks/useAuth";
import { AuthType } from "@features/authentication/types";
import type { AuthErrors, Credentials } from "@features/authentication/types";
import { GoogleAuth } from "@services/MilanApi";
import "./index.scss";

const SignIn = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<AuthErrors>({});

  const { authenticateUser, loading } = useAuth(AuthType.SignIn);
  const [showPassword, setshowPassword] = useState(false);

  const handleGoogle = async () => {
    const response = await GoogleAuth();
    window.location.href = response;
  };

  return (
    <>
      <Helmet>
        <title>NgoWorld | Login</title>
        <meta
          name="description"
          content="Welcome to the Club's login page. Provide all the needed credentials and join us."
        />
        <link rel="canonical" href="/" />
      </Helmet>
      <Navbar />

      <div className="signup_parent">
        <div className="signup_container">
          <div className="signup_container_left">
            <div className="header">
              <h1>Sign In</h1>
            </div>

            <form
              className="auth_form"
              onSubmit={(e) => {
                e.preventDefault();
                authenticateUser(credentials, setErrors);
              }}
            >
              <div className="auth_form_body">
                <div className="auth_element">
                  <div className="auth_dropdown"></div>
                </div>

                <div className="auth_element">
                  <label className="auth_label">
                    Email <span>*</span>
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    className="auth_input"
                    placeholder="john@gmail.com"
                    onChange={(e) => {
                      setCredentials((prev) => {
                        return {
                          ...prev,
                          email: e.target.value,
                        };
                      });
                    }}
                  />
                  <p>{errors.email}</p>
                </div>

                <div className="auth_element">
                  <label className="auth_label">
                    Password <span>*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth_input"
                    placeholder="********"
                    value={credentials.password}
                    min={8}
                    onChange={(e) => {
                      setCredentials((prev) => {
                        return {
                          ...prev,
                          password: e.target.value,
                        };
                      });
                    }}
                  />
                  {showPassword ? (
                    <FaEye
                      onClick={() => {
                        setshowPassword(!showPassword);
                      }}
                      className="togglePassword_icon"
                    />
                  ) : (
                    <FaEyeSlash
                      onClick={() => {
                        setshowPassword(!showPassword);
                      }}
                      className="togglePassword_icon"
                    />
                  )}
                  <p>{errors.password}</p>
                </div>
              </div>
              <div className="auth_footer">
                <Button
                  type="submit"
                  className="auth_submit"
                  isLoading={loading}
                  disabled={
                    loading || !credentials.email || !credentials.password
                  }
                >
                  Sign In
                </Button>

                <div className="signup_or">
                  <hr />
                  <span>or</span>
                  <hr />
                </div>

                <button className="btn authpage_oauth" onClick={handleGoogle}>
                  <FcGoogle
                    style={{ fontSize: "18px", marginRight: "0.7rem" }}
                  />
                  Continue with Google
                </button>

                <div className="auth_forgot_section">
                  <Link to={"/auth/signup"}>Sign Up to NgoWorld</Link> <p>|</p>{" "}
                  <p>Forgot Password</p>
                </div>
              </div>
            </form>
          </div>

          <div className="signup_rightabstract">
            <img src={rightabstract} alt="" />
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;
