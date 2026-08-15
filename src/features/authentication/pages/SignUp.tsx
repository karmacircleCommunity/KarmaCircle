// Import statements
import { authTypeOptions } from "@statics/Constants";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { Link } from "react-router-dom";
import Select from "react-select";
import rightabstract from "@assets/pictures/authpages/authbanner.png";
import { Button, Navbar } from "@components";
import { useAuth } from "@features/authentication/hooks/useAuth";
import { AuthType } from "@features/authentication/types";
import type { AuthErrors, Credentials } from "@features/authentication/types";
import { UserType } from "@/types/user";
import { GoogleAuth } from "@services/MilanApi";

const SignUp = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
    userType: authTypeOptions[1],
  });
  const [errors, setErrors] = useState<AuthErrors>({});

  // Auth functions
  const { authenticateUser, loading } = useAuth(AuthType.SignUp);
  const [showPassword, setshowPassword] = useState(false);

  // Handlers
  const handleGoogle = async () => {
    const response = await GoogleAuth();
    window.location.href = response;
  };

  return (
    <>
      <Helmet>
        <title>NgoWorld | SignUp</title>
        <meta
          name="description"
          content="Welcome to the Club's registration page. Provide all the needed credentials and join us."
        />
        <link rel="canonical" href="/" />
      </Helmet>

      <Navbar />

      <div className="flex h-screen flex-col items-center justify-center gap-4 overflow-y-hidden px-[20.5px] max-[600px]:h-[90vh] max-[600px]:justify-center max-[600px]:overflow-y-scroll max-[600px]:bg-white max-[600px]:px-6 max-[600px]:py-8">
        <div className="flex w-full max-w-[900px] gap-16 rounded-[10px] bg-white p-8 shadow-[0px_0px_24px_-2px_rgba(255,91,49,0.56)] max-[600px]:p-0 max-[600px]:shadow-none">
          <div className="flex w-1/2 flex-col gap-[20px] max-[600px]:w-full">
            <div className="flex items-center gap-[10px]">
              <h1 className="font-poppins text-[35px] leading-none font-bold text-brand-secondary">
                Sign Up
              </h1>
            </div>
            <form
              className="flex h-full flex-col gap-[1.2rem]"
              onSubmit={(e) => {
                e.preventDefault();
                authenticateUser(credentials, setErrors);
              }}
            >
              <div className="flex h-full grow flex-col gap-[10px]">
                <div className="relative flex w-full flex-col"></div>

                <div className="relative hidden! w-full flex-col max-[600px]:flex!">
                  <label className="mb-[3px] font-outfit text-[17px] font-normal text-brand-secondary">
                    Account Type
                    <span className="text-red-600">*</span>
                  </label>

                  <Select
                    options={authTypeOptions}
                    styles={{
                      container: (baseStyles) => ({
                        ...baseStyles,
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "15px !important",
                      }),
                    }}
                    onChange={(e) => {
                      setCredentials((prev) => {
                        return {
                          ...prev,
                          userType: e ?? undefined,
                          email: "",
                          password: "",
                          name: "",
                        };
                      });
                    }}
                    defaultValue={authTypeOptions[1]}
                  />
                </div>
                <div className="relative flex w-full flex-col">
                  <label className="mb-[3px] font-outfit text-[17px] font-normal text-brand-secondary">
                    {credentials.userType?.value === UserType.Individual
                      ? "Full Name"
                      : "Organization Name"}{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="font-outfit block w-full appearance-none rounded-[0.375rem] border border-[#ced4da] bg-white bg-clip-padding px-3 py-[0.375rem] text-[15px] leading-normal font-normal text-[#000000f8] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:font-poppins placeholder:text-[10px]! focus:border-brand focus:shadow-none focus:outline-none"
                    placeholder={
                      credentials.userType?.value === UserType.Individual
                        ? "John Doe"
                        : "Save Tigers"
                    }
                    value={credentials.name}
                    onChange={(e) => {
                      setCredentials((prev) => {
                        return {
                          ...prev,
                          name: e.target.value,
                        };
                      });
                    }}
                  />
                </div>

                <div className="relative flex w-full flex-col">
                  <label className="mb-[3px] font-outfit text-[17px] font-normal text-brand-secondary">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    className="font-outfit block w-full appearance-none rounded-[0.375rem] border border-[#ced4da] bg-white bg-clip-padding px-3 py-[0.375rem] text-[15px] leading-normal font-normal text-[#000000f8] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:font-poppins placeholder:text-[10px]! focus:border-brand focus:shadow-none focus:outline-none"
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
                  <p className="mb-[3px] font-outfit text-sm leading-[1.2] font-normal text-red-600 opacity-80">
                    {errors.email}
                  </p>
                </div>

                <div className="relative flex w-full flex-col">
                  <label className="mb-[3px] font-outfit text-[17px] font-normal text-brand-secondary">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="font-outfit block w-full appearance-none rounded-[0.375rem] border border-[#ced4da] bg-white bg-clip-padding px-3 py-[0.375rem] text-[15px] leading-normal font-normal text-[#000000f8] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:font-poppins placeholder:text-[10px]! focus:border-brand focus:shadow-none focus:outline-none"
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
                      className="absolute top-10 right-[15px] cursor-pointer select-none"
                    />
                  ) : (
                    <FaEyeSlash
                      onClick={() => {
                        setshowPassword(!showPassword);
                      }}
                      className="absolute top-10 right-[15px] cursor-pointer select-none"
                    />
                  )}
                  <p className="mb-[3px] font-outfit text-sm leading-[1.2] font-normal text-red-600 opacity-80">
                    {errors.password}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-col justify-end">
                <Button
                  type="submit"
                  className="w-full rounded-[0.375rem] font-poppins"
                  isLoading={loading}
                  disabled={
                    loading ||
                    !credentials.email ||
                    !credentials.password ||
                    !credentials.name
                  }
                >
                  Sign Up
                </Button>

                <div className="flex items-center gap-[10px] font-outfit! text-black/[0.54]">
                  <hr className="w-full" />
                  <span>or</span>
                  <hr className="w-full" />
                </div>

                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-md border border-brand bg-transparent text-center text-[15px] text-black font-outfit hover:border-brand"
                  onClick={handleGoogle}
                >
                  <FcGoogle
                    style={{ fontSize: "18px", marginRight: "0.7rem" }}
                  />
                  Continue with Google
                </button>

                <div className="mx-auto mt-[10px] flex w-fit cursor-pointer justify-center gap-[10px] text-center font-outfit text-sm text-black/[0.54] [&>:nth-child(2)]:cursor-default">
                  <Link
                    to={"/auth/signin"}
                    className="text-black/[0.54] no-underline"
                  >
                    {" "}
                    Already have an account? Login
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {/* Right abstract */}
          <div className="relative w-[350px] grow max-[600px]:hidden">
            <div className="absolute top-[12px] left-[12px] flex flex-col gap-[7px]">
              <div className="custom-checkbox">
                <input id="status" type="checkbox" name="status" />
                <label htmlFor="status">
                  <div
                    className="status-switch"
                    data-unchecked="Organization"
                    data-checked="Individual"
                    onClick={() => {
                      setCredentials((prev) => {
                        return {
                          userType:
                            prev.userType?.value === UserType.Individual
                              ? authTypeOptions[1]
                              : authTypeOptions[0],
                          email: "",
                          password: "",
                          name: "",
                        };
                      });
                      setErrors({});
                    }}
                  ></div>
                </label>
              </div>
            </div>
            <img
              src={rightabstract}
              alt=""
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;
