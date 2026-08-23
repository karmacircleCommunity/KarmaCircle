import AuthLayout from "@features/authentication/components/AuthLayout";
import { useAuth } from "@features/authentication/hooks/useAuth";
import type { AuthErrors, Credentials } from "@features/authentication/types";
import { AuthType } from "@features/authentication/types";
import { validateEmail } from "@features/authentication/utils/validateEmail";
import { GoogleAuth } from "@services/MilanApi";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { Link } from "react-router-dom";
import { Button } from "@components";

// Same input styling as the sign-up form (SignUp.tsx) — kept as an
// identical local copy rather than a shared export since the two files
// don't share a component module, only the AuthLayout shell.
const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-outfit text-body text-ink transition placeholder:text-[14px] placeholder:text-gray-500 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/15 focus:outline-none";

// Same local copy as SignUp.tsx — both fields on this form are mandatory;
// this is purely a visual "required" cue next to the label, not tied to
// HTML's own `required` attribute/validation, which `useAuth.ts` already
// handles via `errors` + the submit gate.
const RequiredMark = () => (
  <span className="ml-0.5 align-top text-xs text-red-500" aria-hidden="true">
    *
  </span>
);

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
        <link rel="canonical" href="/auth/signin" />
      </Helmet>

      <AuthLayout>
        <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
          Welcome back
        </h1>
        <p className="mt-2 font-outfit text-body text-gray-600">
          Log in to your account to keep supporting the causes you care
          about.
        </p>

        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            authenticateUser(credentials, setErrors);
          }}
        >
          <div className="relative flex w-full flex-col">
            <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
              Email
              <RequiredMark />
            </label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={credentials.email}
              className={inputClasses}
              placeholder="john@gmail.com"
              onChange={(e) => {
                setCredentials((prev) => ({
                  ...prev,
                  email: e.target.value,
                }));
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
            />
            {errors.email && (
              <p className="mt-1 font-outfit text-body text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          <div className="relative flex w-full flex-col">
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="font-outfit text-body font-medium text-gray-800">
                Password
                <RequiredMark />
              </label>
              {/* Not a link — there's no forgot-password route in this
                  app yet (confirmed against routesConfig.tsx). The old
                  layout had the same plain, inert text; keeping that
                  rather than linking to a route that 404s. */}
              <span className="font-outfit text-sm text-gray-400">
                Forgot password?
              </span>
            </div>
            {/* Icon's positioning parent is this wrapper, not the outer
                flex column above — keeping it scoped to just the input
                means top-1/2 centers it against the input's own box,
                regardless of label height/font size. */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                className={`${inputClasses} pr-11`}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => {
                  setCredentials((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }));
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
              />
              {showPassword ? (
                <FaEye
                  onClick={() => setshowPassword(!showPassword)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-gray-400 select-none hover:text-ink"
                />
              ) : (
                <FaEyeSlash
                  onClick={() => setshowPassword(!showPassword)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-gray-400 select-none hover:text-ink"
                />
              )}
            </div>
            {errors.password && (
              <p className="mt-1 font-outfit text-body text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(138,90,46,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(138,90,46,0.55)] disabled:bg-[var(--auth-accent)]!"
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

            <div className="flex items-center gap-3 py-1">
              <hr className="w-full border-gray-200" />
              <span className="font-outfit text-sm tracking-wide text-gray-500 uppercase">
                or
              </span>
              <hr className="w-full border-gray-200" />
            </div>

            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-outfit text-[15px] font-medium text-ink transition-colors hover:border-gray-400 hover:bg-gray-50"
              onClick={handleGoogle}
            >
              <FcGoogle className="text-lg" />
              Continue with Google
            </button>
          </div>
        </form>

        <p className="mt-6 text-center font-outfit text-body text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            to={"/auth/signup"}
            className="font-medium text-[var(--auth-accent)] no-underline hover:underline"
          >
            Sign up
          </Link>
        </p>
      </AuthLayout>
    </>
  );
};

export default SignIn;
