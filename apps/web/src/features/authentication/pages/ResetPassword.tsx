import { Button } from "@components";
import {
  RequiredMark,
  inputClasses,
} from "@features/authentication/components/AuthFieldKit";
import AuthLayout from "@features/authentication/components/AuthLayout";
import {
  PASSWORD_STRENGTH_META,
  getPasswordStrength,
} from "@features/authentication/utils/passwordStrength";
import { ResetPassword as ResetPasswordRequest } from "@services/KarmaCircleApi";
import { STATUSCODE, passwordRegex } from "@statics/Constants";
import { showSuccessToast } from "@utils/Toasts";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

// Step 2 of the reset flow, opened from the link ForgotPassword.tsx's
// request emailed out — `:token` is read from the route, never typed in
// by hand. A wrong/expired/already-used token only surfaces as a 400 once
// the form is submitted (the token itself is opaque to the frontend, so
// there's nothing to validate about it client-side before then).
const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    token?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async () => {
    if (!passwordRegex.test(newPassword)) {
      setErrors((prev) => ({
        ...prev,
        newPassword:
          "Password must be minimum 8 characters long with atleast 1 number, 1 uppercase and 1 lowercase letter",
      }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords don't match",
      }));
      return;
    }

    setErrors({});
    setLoading(true);
    const response = await ResetPasswordRequest({
      token: token ?? "",
      newPassword,
    });
    setLoading(false);

    if (response?.status === STATUSCODE.OK) {
      showSuccessToast(response.data?.message);
      setSucceeded(true);
      setTimeout(() => navigate("/auth/signin"), 1500);
    } else if (response?.status === STATUSCODE.BAD_REQUEST) {
      setErrors((prev) => ({
        ...prev,
        token:
          response?.data?.message ||
          "This password reset link is invalid or has expired.",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        token: response?.data?.message || "Something went wrong. Please try again.",
      }));
    }
  };

  return (
    <>
      <Helmet>
        <title>KarmaCircle | Reset Password</title>
        <meta
          name="description"
          content="Choose a new password for your KarmaCircle account."
        />
        <link rel="canonical" href={location.pathname} />
      </Helmet>

      <AuthLayout>
        {succeeded ? (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Password reset
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              Taking you to sign in...
            </p>
          </>
        ) : (
          <>
            <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink">
              Choose a new password
            </h1>
            <p className="mt-2 font-outfit text-body text-gray-600">
              Make it something you haven&rsquo;t used before.
            </p>

            {errors.token && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 font-outfit text-body text-red-600">
                {errors.token}{" "}
                <Link
                  to="/auth/forgot-password"
                  className="font-medium underline underline-offset-2"
                >
                  Request a new link
                </Link>
              </p>
            )}

            <form
              className="mt-6 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="relative flex w-full flex-col">
                <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                  New password
                  <RequiredMark />
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    className={`${inputClasses} pr-11`}
                    placeholder="Create a password"
                    value={newPassword}
                    autoFocus
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) {
                        setErrors((prev) => ({ ...prev, newPassword: undefined }));
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
                {errors.newPassword ? (
                  <p className="mt-1 font-outfit text-body text-red-500">
                    {errors.newPassword}
                  </p>
                ) : (
                  passwordStrength === "weak" && (
                    <p className="mt-1 font-outfit text-body text-gray-500">
                      Use 8+ characters with an uppercase letter, a lowercase
                      letter, and a number.
                    </p>
                  )
                )}
              </div>

              <div className="relative flex w-full flex-col">
                <label className="mb-1.5 font-outfit text-body font-medium text-gray-800">
                  Confirm new password
                  <RequiredMark />
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirm-new-password"
                  autoComplete="new-password"
                  className={inputClasses}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 font-outfit text-body text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-[var(--auth-accent)]! px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--auth-accent-hover)]! hover:shadow-[0_10px_26px_-6px_rgba(168,98,62,0.55)] disabled:bg-[var(--auth-accent)]!"
                isLoading={loading}
                disabled={loading || !newPassword || !confirmPassword}
              >
                Reset password
              </Button>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
};

export default ResetPassword;
