import { Button } from "@components";
import {
  RequiredMark,
  inputClasses,
} from "@features/authentication/components/AuthFieldKit";
import AuthLayout from "@features/authentication/components/AuthLayout";
import { validateEmail } from "@features/authentication/utils/validateEmail";
import { ForgotPassword as ForgotPasswordRequest } from "@services/KarmaCircleApi";
import { STATUSCODE } from "@statics/Constants";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";

// Step 1 of the reset flow (step 2 is ResetPassword.tsx, opened from the
// emailed link). Deliberately never tells the visitor whether the email
// they entered actually has an account — the backend's response is
// identical either way (see apps/api/docs/specs/auth.md), and this page
// mirrors that by always swapping to the same "check your inbox" copy
// on a successful submit, not just when an account existed.
const ForgotPassword = () => {
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEmailFormatValid = validateEmail(email) === null;

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError(undefined);
    setLoading(true);
    const response = await ForgotPasswordRequest(email);
    setLoading(false);

    if (response?.status === STATUSCODE.OK) {
      setSubmitted(true);
    } else {
      setError(response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Helmet>
        <title>KarmaCircle | Forgot Password</title>
        <meta
          name="description"
          content="Reset the password for your KarmaCircle account."
        />
        <link rel="canonical" href={location.pathname} />
      </Helmet>

      <AuthLayout>
        <Link
          to="/auth/signin"
          className="mb-5 inline-flex items-center gap-1.5 font-outfit text-body text-gray-500 transition-colors hover:text-ink"
        >
          <span aria-hidden>←</span> Back to sign in
        </Link>

        {submitted ? (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Check your inbox
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              If an account exists for <span className="font-medium text-ink">{email}</span>,
              we&rsquo;ve sent a link to reset the password. It expires in 1 hour.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Forgot your password?
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              Enter the email on your account and we&rsquo;ll send you a link to reset it.
            </p>

            <form
              className="mt-6 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
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
                  autoComplete="email"
                  value={email}
                  className={inputClasses}
                  placeholder="john@gmail.com"
                  autoFocus
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) {
                      setError(undefined);
                    }
                  }}
                />
                {error && (
                  <p className="mt-1 font-outfit text-body text-red-500">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(168,98,62,0.55)] disabled:bg-[var(--auth-accent)]!"
                isLoading={loading}
                disabled={!email || !isEmailFormatValid || loading}
              >
                Send reset link
              </Button>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
};

export default ForgotPassword;
