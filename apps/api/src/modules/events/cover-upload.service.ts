import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { findByEmail } from "../users/user.service";

/**
 * Event cover uploads go straight from the browser to the image service
 * (apps/image-service), not through this API. The API stays the one place
 * that knows who is signed in: it checks the caller may create events and
 * hands back a short-lived token that says so. The image service checks the
 * token with the shared secret and never sees a session cookie.
 *
 * The claims here are the contract with the Go side, see
 * apps/image-service/internal/auth/token.go: HS256, issuer, audience,
 * purpose, a subject, and an expiry of five minutes.
 */
export const COVER_TOKEN_ISSUER = "karmacircle-api";
export const COVER_TOKEN_AUDIENCE = "image-service";
export const COVER_TOKEN_PURPOSE = "event-cover";
export const COVER_TOKEN_TTL_SECONDS = 5 * 60;

/** The largest cover the image service accepts. Keep in step with its MAX_UPLOAD_BYTES. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

export interface ImageServiceSettings {
  url?: string;
  secret?: string;
}

export interface CoverUploadGrant {
  uploadUrl: string;
  token: string;
  expiresAt: string;
  maxBytes: number;
}

/** A stable id for the caller that does not expose their email address. */
const subjectFor = (email: string) =>
  createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);

/** Signs the token. Separate from the account checks so it can be tested alone. */
export function signCoverUploadToken(
  email: string,
  secret: string,
  now: Date = new Date(),
): { token: string; expiresAt: Date } {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const token = jwt.sign(
    { purpose: COVER_TOKEN_PURPOSE, iat: issuedAt },
    secret,
    {
      algorithm: "HS256",
      issuer: COVER_TOKEN_ISSUER,
      audience: COVER_TOKEN_AUDIENCE,
      subject: subjectFor(email),
      expiresIn: COVER_TOKEN_TTL_SECONDS,
    },
  );
  return {
    token,
    expiresAt: new Date((issuedAt + COVER_TOKEN_TTL_SECONDS) * 1000),
  };
}

/**
 * Lets a signed-in organization account upload one event cover. Same account
 * rules as creating an event, so nobody can use the image service who could
 * not use the form it serves.
 */
export async function issueCoverUploadGrant(
  email: string,
  settings: ImageServiceSettings = {
    url: env.IMAGE_SERVICE_URL,
    secret: env.IMAGE_SERVICE_SECRET,
  },
): Promise<CoverUploadGrant> {
  if (!settings.url || !settings.secret) {
    throw new AppError(
      STATUS_CODE.SERVICE_UNAVAILABLE,
      STATUS_MESSAGE.IMAGE_UPLOADS_NOT_CONFIGURED,
    );
  }

  const account = await findByEmail(email);
  if (!account) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  if (account.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  const { token, expiresAt } = signCoverUploadToken(email, settings.secret);
  return {
    uploadUrl: `${settings.url}/v1/images`,
    token,
    expiresAt: expiresAt.toISOString(),
    maxBytes: COVER_MAX_BYTES,
  };
}
