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
import { validateEmail } from "@features/authentication/utils/validateEmail";
import { GoogleAuth } from "@services/MilanApi";

const SignIn = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<AuthErrors>({});

  const { authenticateUser, loading } = useAuth(AuthType.SignIn);
  const [showPassword, setshowPassword] = useState(false);

  // Same shared check `SignUp.tsx` and `useAuth.ts` use — drives the
  // submit button's disabled state so a non-empty but malformed email
  // can't be submitted, not just an empty one.
  const isEmailFormatValid = validateEmail(credentials.email) === null;

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

      <div className="px-5.125 flex h-screen flex-col items-center justify-center gap-4 overflow-y-hidden max-[600px]:h-[90vh] max-[600px]:justify-center max-[600px]:overflow-y-scroll max-[600px]:bg-white max-[600px]:px-6 max-[600px]:py-8">
        <div className="flex w-full max-w-225 gap-16 rounded-10px bg-white p-8 shadow-[0px_0px_24px_-2px_rgba(255,91,49,0.56)] max-[600px]:p-0 max-[600px]:shadow-none">
          <div className="flex w-1/2 flex-col gap-5 max-[600px]:w-full">
            <div className="flex items-center gap-2.5">
              <h1 className="font-poppins text-[35px] leading-none font-bold text-brand-secondary">
                Sign In
              </h1>
            </div>

            <form
              className="flex h-full flex-col gap-[1.2rem]"
              onSubmit={(e) => {
                e.preventDefault();
                authenticateUser(credentials, setErrors);
              }}
            >
              <div className="flex h-full grow flex-col gap-2.5">
                <div className="relative flex w-full flex-col"></div>

                <div className="relative flex w-full flex-col">
                  <label className="mb-0.75 font-outfit text-body-lg font-normal text-brand-secondary">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    className="block w-full appearance-none rounded-md border border-input-border bg-white bg-clip-padding px-3 py-1.5 font-outfit text-body leading-normal font-normal text-black/[97%] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:font-poppins placeholder:text-caption! focus:border-brand focus:shadow-none focus:outline-none"
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
                  <p className="leading-1.2 mb-0.75 font-outfit text-sm font-normal text-red-600 opacity-80">
                    {errors.email}
                  </p>
                </div>

                <div className="relative flex w-full flex-col">
                  <label className="mb-0.75 font-outfit text-body-lg font-normal text-brand-secondary">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="block w-full appearance-none rounded-md border border-input-border bg-white bg-clip-padding px-3 py-1.5 font-outfit text-body leading-normal font-normal text-black/[97%] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:font-poppins placeholder:text-caption! focus:border-brand focus:shadow-none focus:outline-none"
                    placeholder="********"
                    value={credentials.password}
                    minLength={8}
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
                      className="absolute top-10 right-3.75 cursor-pointer select-none"
                    />
                  ) : (
                    <FaEyeSlash
                      onClick={() => {
                        setshowPassword(!showPassword);
                      }}
                      className="absolute top-10 right-3.75 cursor-pointer select-none"
                    />
                  )}
                  <p className="leading-1.2 mb-0.75 font-outfit text-sm font-normal text-red-600 opacity-80">
                    {errors.password}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-col justify-end">
                <Button
                  type="submit"
                  className="w-full rounded-md font-poppins"
                  isLoading={loading}
                  disabled={
                    loading ||
                    !credentials.email ||
                    !credentials.password ||
                    !isEmailFormatValid
                  }
                >
                  Sign In
                </Button>

                <div className="flex items-center gap-2.5 font-outfit! text-black/[0.54]">
                  <hr className="w-full" />
                  <span>or</span>
                  <hr className="w-full" />
                </div>

                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-center rounded-md border border-brand bg-transparent text-center font-outfit text-body text-black hover:border-brand"
                  onClick={handleGoogle}
                >
                  <FcGoogle className="mr-2.8 text-lg" />
                  Continue with Google
                </button>

                <div className="mx-auto mt-2.5 flex w-fit cursor-pointer justify-center gap-2.5 text-center font-outfit text-sm text-black/[0.54] [&>:nth-child(2)]:cursor-default">
                  <Link
                    to={"/auth/signup"}
                    className="text-black/[0.54] no-underline"
                  >
                    Sign Up to NgoWorld
                  </Link>{" "}
                  <p>|</p> <p>Forgot Password</p>
                </div>
              </div>
            </form>
          </div>

          <div className="relative w-87.5 grow max-[600px]:hidden">
            <img
              src={rightabstract}
              alt=""
              className="size-full rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;
