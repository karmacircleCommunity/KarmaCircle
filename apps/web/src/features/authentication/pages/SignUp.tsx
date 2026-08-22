// Import statements
import {
  authTypeOptions,
  nameRegex,
  passwordRegex,
  STATUSCODE,
  STATUSMESSAGE,
} from "@statics/Constants";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { FiAward, FiCalendar, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import signupPanelArt from "@assets/pictures/authpages/signup-panel-waves.jpg";
import { Button } from "@components";
import { useAuth } from "@features/authentication/hooks/useAuth";
import { AuthType } from "@features/authentication/types";
import type { AuthErrors, Credentials } from "@features/authentication/types";
import { UserType } from "@/types/user";
import { CheckEmailExists, GoogleAuth } from "@services/MilanApi";
import { validateEmail } from "@features/authentication/utils/validateEmail";

// Value props for the left panel — genuine reasons to sign up, not
// decoration. No numbers/stats here on purpose: this app doesn't have real
// usage data to back a claim like "10,000+ organizations" and this codebase
// already has a documented problem elsewhere (Landing.tsx) with fabricated
// stats standing in for real ones — not repeating that here.
const VALUE_PROPS = [
  {
    icon: FiUsers,
    title: "Reach the right people",
    description:
      "Get discovered by donors and volunteers actively searching for causes like yours.",
  },
  {
    icon: FiCalendar,
    title: "Host events effortlessly",
    description:
      "Create and manage events with built-in RSVPs, all in one place.",
  },
  {
    icon: FiAward,
    title: "Build trust with a public profile",
    description: "Share your story, your impact, and your mission.",
  },
];

const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-outfit text-[15px] text-ink transition placeholder:text-gray-400 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/15 focus:outline-none";

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

const SignUp = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
    userType: authTypeOptions[1],
  });
  const [errors, setErrors] = useState<AuthErrors>({});

  // Two steps: (1) pick account type + email, (2) name + password. A
  // four-field form doesn't need a full multi-step wizard, but asking for
  // everything — including a name — in one dense block is what read as
  // "too much at once". Splitting after email (the same pattern Linear/
  // Notion/Vercel use) gets people past the biggest commitment point fast
  // and asks for the name only once they've already started.
  const [step, setStep] = useState<1 | 2>(1);

  // Auth functions
  const { authenticateUser, loading } = useAuth(AuthType.SignUp);
  const [showPassword, setshowPassword] = useState(false);

  // Set true only by handleContinue's live check-email call — distinct
  // from `errors.email` just being non-empty, since a plain "invalid
  // format" error shouldn't offer a "Log in instead" link.
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const isIndividual = credentials.userType?.value === UserType.Individual;

  // The final signup submit can also come back with this exact 409
  // message (useAuth.ts maps it onto `errors.email`) if the live check
  // above was skipped or raced by another signup for the same email —
  // treat that the same as `emailTaken` for showing the "Log in" link.
  const showLoginLink =
    emailTaken || errors.email === STATUSMESSAGE.USER_ALREADY_EXISTS;

  const passwordStrength = getPasswordStrength(credentials.password);

  // Same `validateEmail` used everywhere else email is checked in this
  // feature — drives the "Continue" button's disabled state below so a
  // malformed email (non-empty, so the plain `!credentials.email` check
  // alone wouldn't catch it) can't even be submitted, not just rejected
  // after the fact.
  const isEmailFormatValid = validateEmail(credentials.email) === null;

  // If the backend comes back with an email-specific error (e.g. "user
  // already exists") while the user is on step 2, the email field itself
  // isn't on screen to show it — step back automatically so the error (and
  // the toast that already fired alongside it) has somewhere to land.
  useEffect(() => {
    if (step === 2 && errors.email) {
      setStep(1);
    }
  }, [step, errors.email]);

  // Single account-type control, used at every breakpoint. This replaces
  // the old pair of controls (a mobile-only react-select dropdown and a
  // desktop checkbox-styled switch) that wrote to the same state but could
  // fall out of sync with each other and cleared `errors` inconsistently.
  const setUserType = (option: (typeof authTypeOptions)[number]) => {
    setCredentials((prev) => ({
      ...prev,
      userType: option,
      email: "",
      password: "",
      name: "",
    }));
    setErrors({});
  };

  const handleContinue = async () => {
    const emailError = validateEmail(credentials.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      setEmailTaken(false);
      return;
    }

    setErrors({});
    setEmailTaken(false);
    setCheckingEmail(true);
    const response = await CheckEmailExists(credentials.email);
    setCheckingEmail(false);

    // Fail open on a broken/unreachable check — the final signup submit
    // still catches a genuine duplicate via its own 409 (see useAuth.ts),
    // so a flaky check-email call shouldn't be the thing blocking signup.
    if (response?.status === STATUSCODE.OK && response.data?.exists) {
      setErrors((prev) => ({
        ...prev,
        email: STATUSMESSAGE.USER_ALREADY_EXISTS,
      }));
      setEmailTaken(true);
      return;
    }

    setStep(2);
  };

  // Handlers
  const handleGoogle = async () => {
    const response = await GoogleAuth(credentials.userType?.value);
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
        <link rel="canonical" href="/auth/signup" />
      </Helmet>

      <div
        className="flex min-h-screen w-full"
        style={
          {
            // Scoped to this page only — a deliberate accent shift away
            // from the site-wide orange brand color for the auth flow,
            // not a global rebrand. Picked to match the generated panel
            // image's dominant warm amber tone instead of clashing with
            // it. If this should become the site-wide brand color, that's
            // a separate decision — say so and we'll change the actual
            // --color-brand token in styles/index.css instead.
            "--auth-accent": "#8a5a2e",
            "--auth-accent-hover": "#744a24",
          } as CSSProperties
        }
      >
        {/* Left panel — value proposition, not decoration. Hidden below
            900px, where the form takes the full width instead. */}
        <div className="relative hidden w-[46%] shrink-0 flex-col justify-center overflow-hidden bg-[#0e0906] px-14 py-12 min-[900px]:flex">
          <img
            src={signupPanelArt}
            alt=""
            className="pointer-events-none absolute inset-0 size-full scale-125 object-cover blur-2xl"
          />
          {/* Scrim so the value-prop text stays legible regardless of where
              the image's lighter highlights land underneath it. Lighter
              than before — the blur above already does most of the work
              of keeping the image from competing with the text. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.35)_28%,rgba(0,0,0,0.4)_75%,transparent_100%)]"
          />

          <Link
            to="/"
            className="absolute top-10 left-14 flex items-center gap-2 font-outfit text-sm font-medium text-white/90 no-underline"
          >
            <span className="inline-block size-1.5 rounded-full bg-[var(--auth-accent)]" />
            NgoWorld
          </Link>

          <div className="relative z-10 max-w-md">
            <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
              Bring your cause to people who care.
            </h2>
            <p className="mt-3 font-outfit text-body text-white/70">
              Join NgoWorld to connect with donors, volunteers, and a
              community ready to help.
            </p>

            <ul className="mt-10 flex flex-col gap-6">
              {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Icon className="text-lg" />
                  </span>
                  <div>
                    <p className="font-outfit text-body-lg font-semibold text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 font-outfit text-body text-white/65">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right panel — the form */}
        <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
          <Link
            to="/"
            className="mb-8 flex items-center gap-2 self-start font-outfit text-sm font-medium text-ink no-underline min-[900px]:hidden"
          >
            <span className="inline-block size-1.5 rounded-full bg-[var(--auth-accent)]" />
            NgoWorld
          </Link>

          <div className="w-full max-w-sm">
            {step === 1 ? (
              <>
                <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
                  Create your account
                </h1>
                <p className="mt-2 font-outfit text-body text-gray-500">
                  Sign up as an individual, or register your organization.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mb-5 inline-flex items-center gap-1.5 font-outfit text-sm text-gray-400 transition-colors hover:text-ink"
                >
                  <span aria-hidden>←</span> Back
                </button>
                <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
                  {isIndividual
                    ? "What's your name?"
                    : "What's your organization called?"}
                </h1>
                <p className="mt-2 font-outfit text-body text-gray-500">
                  This appears on your public profile.
                </p>
              </>
            )}

            {step === 1 ? (
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
                    const selected =
                      credentials.userType?.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setUserType(option)}
                        className={`-mb-px cursor-pointer border-b-2 pb-2.5 font-outfit text-sm transition-colors ${
                          selected
                            ? "border-[var(--auth-accent)] font-semibold text-ink"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative flex w-full flex-col">
                  <label className="mb-1.5 font-outfit text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
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
                      if (emailTaken) {
                        setEmailTaken(false);
                      }
                    }}
                  />
                  {errors.email && (
                    <p className="mt-1 font-outfit text-sm text-red-500">
                      {errors.email}
                      {showLoginLink && (
                        <>
                          {" "}
                          <Link
                            to="/auth/signin"
                            className="font-medium text-[var(--auth-accent)] underline"
                          >
                            Log in instead
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="mt-1 flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(138,90,46,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(138,90,46,0.55)] disabled:bg-[var(--auth-accent)]!"
                    isLoading={checkingEmail}
                    disabled={
                      !credentials.email ||
                      !isEmailFormatValid ||
                      checkingEmail
                    }
                  >
                    Continue
                  </Button>

                  <div className="flex items-center gap-3 py-1">
                    <hr className="w-full border-gray-200" />
                    <span className="font-outfit text-xs tracking-wide text-gray-400 uppercase">
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
            ) : (
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
                  authenticateUser(
                    { ...credentials, name: trimmedName },
                    setErrors,
                  );
                }}
              >
                <div className="flex flex-col gap-4">
                  <div className="relative flex w-full flex-col">
                    <label className="mb-1.5 font-outfit text-sm font-medium text-gray-700">
                      {isIndividual ? "Full name" : "Organization name"}
                    </label>
                    <input
                      type="text"
                      className={inputClasses}
                      placeholder={isIndividual ? "John Doe" : "Save Tigers"}
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
                      <p className="mt-1 font-outfit text-sm text-red-500">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="relative flex w-full flex-col">
                    <label className="mb-1.5 font-outfit text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`${inputClasses} pr-11`}
                      placeholder="********"
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
                        onClick={() => setshowPassword(!showPassword)}
                        className="absolute top-9.5 right-3.5 cursor-pointer text-gray-400 select-none hover:text-ink"
                      />
                    ) : (
                      <FaEyeSlash
                        onClick={() => setshowPassword(!showPassword)}
                        className="absolute top-9.5 right-3.5 cursor-pointer text-gray-400 select-none hover:text-ink"
                      />
                    )}
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
                      <p className="mt-1 font-outfit text-sm text-red-500">
                        {errors.password}
                      </p>
                    ) : (
                      passwordStrength === "weak" && (
                        <p className="mt-1 font-outfit text-sm text-gray-400">
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

            {step === 1 && (
              <p className="mt-6 text-center font-outfit text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  to={"/auth/signin"}
                  className="font-medium text-[var(--auth-accent)] no-underline hover:underline"
                >
                  Log in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;
