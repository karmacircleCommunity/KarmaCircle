// Import statements
import { UserType } from "@/types/user";
import { Button } from "@components";
import AuthLayout from "@features/authentication/components/AuthLayout";
import { useAuth } from "@features/authentication/hooks/useAuth";
import type { AuthErrors, Credentials } from "@features/authentication/types";
import { AuthType } from "@features/authentication/types";
import { validateEmail } from "@features/authentication/utils/validateEmail";
import { CheckEmailExists, GoogleAuth } from "@services/MilanApi";
import {
  authTypeOptions,
  nameRegex,
  passwordRegex,
  STATUSCODE,
} from "@statics/Constants";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { useLocation } from "react-router-dom";

const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-outfit text-body text-ink transition placeholder:text-[14px] placeholder:text-gray-500 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/15 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500";

// Every field a step asks the user to actually fill in is mandatory — this
// asterisk is purely a visual "required" cue next to the label, not tied to
// HTML's own `required` attribute/validation, which the form already
// handles itself via `errors` + each step's submit gate. Never shown next
// to the disabled, already-answered email field on steps 2/3.
const RequiredMark = () => (
  <span className="ml-0.5 align-top text-xs text-red-500" aria-hidden="true">
    *
  </span>
);

type PasswordStrength = "weak" | "medium" | "strong";

// Live strength read, purely a UX hint — the actual pass/fail gate on
// submit is still `passwordRegex` alone (useAuth.ts). "weak" here means
// "doesn't even meet that minimum yet"; a password can only be "medium"
// or "strong" once it already does.
function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) {
    return null;
  }
  if (!passwordRegex.test(password)) {
    return "weak";
  }
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  return password.length >= 12 && hasSpecialChar ? "strong" : "medium";
}

const PASSWORD_STRENGTH_META: Record<
  PasswordStrength,
  { label: string; barColor: string; textColor: string; barWidth: string }
> = {
  weak: {
    label: "Weak",
    barColor: "bg-red-500",
    textColor: "text-red-500",
    barWidth: "w-1/3",
  },
  medium: {
    label: "Medium",
    barColor: "bg-amber-500",
    textColor: "text-amber-600",
    barWidth: "w-2/3",
  },
  strong: {
    label: "Strong",
    barColor: "bg-green-600",
    textColor: "text-green-600",
    barWidth: "w-full",
  },
};

// One flow, three steps, no separate "Sign In"/"Sign Up" pages:
//   "email"  — pick individual/organization, enter email, Continue.
//   "signin" — CheckEmailExists found an account: email is locked in,
//              password only.
//   "signup" — CheckEmailExists found nothing: email is locked in,
//              name + password.
// Which of "signin"/"signup" the user lands on is decided by the live
// duplicate-email check below, not by which route (/auth/signin vs
// /auth/signup) they arrived on — both routes mount this same component
// and both start at "email". See docs/specs/authentication.md.
type FlowStep = "email" | "signin" | "signup";

const Auth = () => {
  const location = useLocation();

  const [step, setStep] = useState<FlowStep>("email");
  const [credentials, setCredentials] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
    userType: authTypeOptions[0],
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Loading state for the email step's own CheckEmailExists call — kept
  // separate from useAuth's `loading`, which only covers the final
  // sign-in/sign-up submit.
  const [checkingEmail, setCheckingEmail] = useState(false);

  // useAuth's branch (password-strength gate vs plain non-empty check, and
  // which endpoint to hit) follows whichever step we've landed on. Calling
  // the hook with a value that changes across renders is fine — it's still
  // called unconditionally, in the same position, on every render.
  const authType = step === "signup" ? AuthType.SignUp : AuthType.SignIn;
  const { authenticateUser, loading } = useAuth(authType);

  const isIndividual = credentials.userType?.value === UserType.Individual;
  const isEmailFormatValid = validateEmail(credentials.email) === null;
  const passwordStrength = getPasswordStrength(credentials.password);

  // A duplicate the live check below missed (e.g. a race with another
  // signup for the same email) still surfaces as `errors.email` from the
  // signup step's final submit (useAuth.ts maps the backend's 409 onto
  // it) — the email field isn't on screen there, so step back to give it
  // somewhere to render.
  useEffect(() => {
    if (step === "signup" && errors.email) {
      setStep("email");
    }
  }, [step, errors.email]);

  const setUserType = (option: (typeof authTypeOptions)[number]) => {
    setCredentials((prev) => ({ ...prev, userType: option }));
  };

  const handleContinue = async () => {
    const emailError = validateEmail(credentials.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    setErrors({});
    setCheckingEmail(true);
    const response = await CheckEmailExists(credentials.email);
    setCheckingEmail(false);

    // Fail open on a broken/unreachable check — a genuine duplicate is
    // still caught by the signup submit's own 409 (useAuth.ts), so a
    // flaky check-email call shouldn't be what blocks a new signup.
    if (response?.status === STATUSCODE.OK && response.data?.exists) {
      setStep("signin");
    } else {
      setStep("signup");
    }
  };

  const handleBack = () => {
    setStep("email");
    setCredentials((prev) => ({ ...prev, password: "" }));
    setErrors({});
  };

  const handleGoogle = async () => {
    const response = await GoogleAuth(credentials.userType?.value);
    window.location.href = response;
  };

  return (
    <>
      <Helmet>
        <title>NgoWorld | Sign In</title>
        <meta
          name="description"
          content="Sign in or create your NgoWorld account to support the causes you care about."
        />
        <link rel="canonical" href={location.pathname} />
      </Helmet>

      <AuthLayout>
        {step === "email" && (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Welcome to NgoWorld
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              Enter your email to sign in or create an account.
            </p>
          </>
        )}

        {step !== "email" && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-5 inline-flex items-center gap-1.5 font-outfit text-body text-gray-500 transition-colors hover:text-ink"
          >
            <span aria-hidden>←</span> Back
          </button>
        )}

        {step === "signin" && (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Enter your password
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              Good to see you again — welcome back.
            </p>
          </>
        )}

        {step === "signup" && (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              {isIndividual
                ? "What's your name?"
                : "What's your organization called?"}
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              This appears on your public profile.
            </p>
          </>
        )}

        {step === "email" && (
          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleContinue();
            }}
          >
            {/* Quiet underline tabs, not a boxed toggle — this is a
                quick choice on the way to the real ask (email), not a
                decision that should visually compete with it. */}
            <div
              role="tablist"
              aria-label="Account type"
              className="flex gap-6 border-b border-gray-200"
            >
              {authTypeOptions.map((option) => {
                const selected = credentials.userType?.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setUserType(option)}
                    className={`-mb-px cursor-pointer border-b-2 pb-2.5 font-outfit text-body transition-colors ${
                      selected
                        ? "border-[var(--auth-accent)] font-semibold text-ink"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="relative flex w-full flex-col">
              <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                Email
                <RequiredMark />
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={credentials.email}
                className={inputClasses}
                placeholder="john@gmail.com"
                autoFocus
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

            <div className="mt-1 flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(138,90,46,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(138,90,46,0.55)] disabled:bg-[var(--auth-accent)]!"
                isLoading={checkingEmail}
                disabled={
                  !credentials.email || !isEmailFormatValid || checkingEmail
                }
              >
                Continue
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
        )}

        {step === "signin" && (
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
              </label>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={credentials.email}
                disabled
                className={inputClasses}
              />
            </div>

            <div className="relative flex w-full flex-col">
              <div className="mb-1.5 flex items-baseline justify-between">
                <label className="font-outfit text-body font-medium text-gray-800">
                  Password
                  <RequiredMark />
                </label>
                {/* Not a link — there's no forgot-password route in this
                    app yet. */}
                <span className="font-outfit text-sm text-gray-400">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  className={`${inputClasses} pr-11`}
                  placeholder="Enter your password"
                  value={credentials.password}
                  autoFocus
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-gray-400 select-none hover:text-ink"
                  />
                ) : (
                  <FaEyeSlash
                    onClick={() => setShowPassword(!showPassword)}
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

            <Button
              type="submit"
              className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(138,90,46,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(138,90,46,0.55)] disabled:bg-[var(--auth-accent)]!"
              isLoading={loading}
              disabled={loading || !credentials.password}
            >
              Sign In
            </Button>
          </form>
        )}

        {step === "signup" && (
          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedName = credentials.name.trim();
              if (!nameRegex.test(trimmedName)) {
                setErrors((prev) => ({
                  ...prev,
                  name: isIndividual
                    ? "Full name can only contain letters and spaces"
                    : "Organization name can only contain letters and spaces",
                }));
                return;
              }
              setErrors((prev) => ({ ...prev, name: undefined }));
              authenticateUser({ ...credentials, name: trimmedName }, setErrors);
            }}
          >
            <div className="relative flex w-full flex-col">
              <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={credentials.email}
                disabled
                className={inputClasses}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative flex w-full flex-col">
                <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                  {isIndividual ? "Full name" : "Organization name"}
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  name="name"
                  // Explicit, field-specific autocomplete tokens (not "off",
                  // which Chromium-family browsers largely ignore on forms
                  // they've decided look like a login) — this is what stops
                  // the browser from treating a plain text field sitting
                  // right above a password field as a login username and
                  // popping up saved email/password suggestions on it.
                  autoComplete={isIndividual ? "name" : "organization"}
                  className={inputClasses}
                  placeholder={isIndividual ? "John Doe" : "Ex. Save Tigers"}
                  value={credentials.name}
                  autoFocus
                  onChange={(e) => {
                    // Strip anything that isn't a letter or a space as
                    // it's typed, rather than only rejecting it on
                    // submit — so digits/symbols never actually land
                    // in the field (this also sanitizes pasted text).
                    const sanitized = e.target.value.replace(
                      /[^A-Za-z ]/g,
                      "",
                    );
                    setCredentials((prev) => ({
                      ...prev,
                      name: sanitized,
                    }));
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                />
                {errors.name && (
                  <p className="mt-1 font-outfit text-body text-red-500">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="relative flex w-full flex-col">
                <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                  Password
                  <RequiredMark />
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    className={`${inputClasses} pr-11`}
                    placeholder="Create a password"
                    value={credentials.password}
                    minLength={8}
                    onChange={(e) => {
                      setCredentials((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }));
                      if (errors.password) {
                        setErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                  />
                  {showPassword ? (
                    <FaEye
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-gray-400 select-none hover:text-ink"
                    />
                  ) : (
                    <FaEyeSlash
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-gray-400 select-none hover:text-ink"
                    />
                  )}
                </div>
                {passwordStrength && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${PASSWORD_STRENGTH_META[passwordStrength].barColor} ${PASSWORD_STRENGTH_META[passwordStrength].barWidth}`}
                      />
                    </div>
                    <span
                      className={`font-outfit text-xs font-medium ${PASSWORD_STRENGTH_META[passwordStrength].textColor}`}
                    >
                      {PASSWORD_STRENGTH_META[passwordStrength].label}
                    </span>
                  </div>
                )}
                {errors.password ? (
                  <p className="mt-1 font-outfit text-body text-red-500">
                    {errors.password}
                  </p>
                ) : (
                  passwordStrength === "weak" && (
                    <p className="mt-1 font-outfit text-body text-gray-500">
                      Use 8+ characters with an uppercase letter, a
                      lowercase letter, and a number.
                    </p>
                  )
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(138,90,46,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(138,90,46,0.55)] disabled:bg-[var(--auth-accent)]!"
              isLoading={loading}
              disabled={loading || !credentials.password || !credentials.name}
            >
              Sign Up
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
};

export default Auth;
