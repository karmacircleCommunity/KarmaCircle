import { Resend } from "resend";
import { env } from "./env";
import { STATUS_CODE } from "../constants/http-status";
import { AppError } from "../middleware/error-handler";
import { logger } from "./logger";

const DEFAULT_FROM = "KarmaCircle <onboarding@resend.dev>";

// Constructed lazily, not at module load — same reasoning as
// payment.service.ts's getRazorpayClient: RESEND_API_KEY is optional in
// env.ts, so building the client eagerly at import time would crash the
// whole API on boot rather than just the one route that actually needs it.
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new AppError(
      STATUS_CODE.SERVICE_UNAVAILABLE,
      "Email sending is not configured yet.",
    );
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  return resend;
}

function resetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your KarmaCircle password</h2>
      <p>We got a request to reset the password for this account. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: "Reset your KarmaCircle password",
    html: resetEmailHtml(resetUrl),
  });

  if (error) {
    logger.error({ error }, "Failed to send password reset email");
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send the password reset email, try again later.",
    );
  }
}
