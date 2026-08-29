import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { sendPasswordResetEmail } from "../../config/mailer";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import * as organizationService from "../organizations/organization.service";
import { IUser, User, getUserModel } from "../users/user.model";
import * as userService from "../users/user.service";
import { THIRTY_DAYS_MS } from "./auth.cookies";
import { SignupInput } from "./auth.validation";

const SALT_ROUNDS = 10;

// How long a forgot-password link stays valid, counted from the moment
// requestPasswordReset issues it — not tied to THIRTY_DAYS_MS (the
// session/cookie lifetime), a deliberately much shorter window since this
// token alone is enough to take over the account.
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * The raw token is what's emailed and never stored — only its hash lives
 * on the User document (same reasoning as storing a password hash, not
 * the password: a DB read/leak alone shouldn't be enough to reset anyone's
 * account).
 */
function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

interface TokenPayload {
  User: { id: string };
  tokenVersion: number;
}

export function signToken(email: string, tokenVersion: number): string {
  return jwt.sign({ User: { id: email }, tokenVersion }, env.JWT_SECRET, {
    expiresIn: THIRTY_DAYS_MS / 1000,
  });
}

/**
 * Decodes a Token cookie without throwing — used by logout, which must
 * always succeed and clear cookies even if the token it's holding is
 * missing, expired, or otherwise garbage. requireAuth (src/middleware/auth.ts)
 * has its own stricter decode + tokenVersion check for actually gating a
 * protected route; this is deliberately looser, for a "best-effort, who
 * was this" read on the way out rather than an access check on the way in.
 */
export function verifyTokenLoosely(
  token: string | undefined,
): { email: string } | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return { email: decoded.User.id };
  } catch {
    return null;
  }
}

export async function bumpTokenVersion(email: string): Promise<void> {
  await User.updateOne({ email }, { $inc: { tokenVersion: 1 } });
}

export async function signup(
  input: SignupInput,
): Promise<{ token: string; user: unknown }> {
  const { email, userType, ...data } = input;

  const existingUser = await userService.findByEmail(email);
  if (existingUser) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      STATUS_MESSAGE.USER_ALREADY_EXISTS,
    );
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  const userName = await userService.generateUniqueUsername(email);

  const UserModel = getUserModel(userType as string | undefined);
  const newUser = new UserModel({
    ...data,
    userName,
    email,
    password: hashedPassword,
  });
  await newUser.save();

  // An organization signup creates two documents, not one: the login
  // above, and the organization's own (empty, draft) record it will fill
  // in before anyone can see it. Individuals get no such record. See
  // modules/organizations/organization.model.ts.
  if (userType === "organization") {
    await organizationService.createForOwner({
      ownerEmail: email,
      handle: userName,
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : userName,
    });
  }

  return {
    token: signToken(email, newUser.tokenVersion),
    user: userService.sanitize(newUser),
  };
}

export async function signin(
  email: string,
  password: string,
): Promise<{ token: string; user: unknown }> {
  const existingUser = await userService.findByEmail(email);

  if (!existingUser) {
    throw new AppError(
      STATUS_CODE.UNAUTHORIZED,
      STATUS_MESSAGE.INVALID_CREDENTIALS,
    );
  }

  const validPassword = await bcrypt.compare(password, existingUser.password);
  if (!validPassword) {
    throw new AppError(
      STATUS_CODE.UNAUTHORIZED,
      STATUS_MESSAGE.INVALID_CREDENTIALS,
    );
  }

  return {
    token: signToken(existingUser.email, existingUser.tokenVersion),
    user: userService.sanitize(existingUser),
  };
}

export async function updatePassword(
  email: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const existingUser = await userService.findByEmail(email);
  if (!existingUser) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.USER_NOT_FOUND);
  }

  const validPassword = await bcrypt.compare(
    oldPassword,
    existingUser.password,
  );
  if (!validPassword) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.USER_NOT_FOUND);
  }

  existingUser.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Invalidate every session on this account — including whichever one
  // made this call, since this endpoint isn't tied to the caller's own
  // cookie. A password change should never leave old sessions alive.
  existingUser.tokenVersion += 1;
  // A forgot-password token issued before this change but not yet used
  // shouldn't outlive the password it was issued for — otherwise it stays
  // valid (up to RESET_TOKEN_EXPIRY_MS) as a second way into the account
  // after this "real" password change.
  existingUser.resetPasswordToken = undefined;
  existingUser.resetPasswordExpires = undefined;
  await existingUser.save();
}

export async function emailExists(email: string): Promise<boolean> {
  const existingUser = await userService.findByEmail(email);
  return existingUser !== null;
}

/**
 * Issues a forgot-password link for `email` and emails it, if — and only
 * silently if not — an account with that email exists. Always resolves
 * the same way either way (no thrown/returned signal distinguishing
 * "sent" from "no such account") so the caller (authController.forgotPassword)
 * can respond with one generic message regardless; see known-issues.md for
 * why this doesn't newly leak account existence (GET /auth/check-email
 * already answers that question directly, for a different purpose).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const existingUser = await userService.findByEmail(email);
  if (!existingUser) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  existingUser.resetPasswordToken = hashResetToken(rawToken);
  existingUser.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await existingUser.save();

  const resetUrl = `${env.ORIGIN_URL}/auth/reset-password/${rawToken}`;
  await sendPasswordResetEmail(existingUser.email, resetUrl);
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const existingUser = await User.findOne({
    resetPasswordToken: hashResetToken(rawToken),
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!existingUser) {
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      STATUS_MESSAGE.INVALID_RESET_TOKEN,
    );
  }

  existingUser.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Single-use: clear the token so this same link can't reset the
  // password a second time.
  existingUser.resetPasswordToken = undefined;
  existingUser.resetPasswordExpires = undefined;
  // Same reasoning as updatePassword above — a password change should
  // never leave pre-existing sessions alive.
  existingUser.tokenVersion += 1;
  await existingUser.save();
}

export async function findOrCreateGoogleUser(params: {
  email: string;
  name?: string;
  userType?: string;
}): Promise<IUser> {
  const { email, name, userType } = params;

  const existingUser = await userService.findByEmail(email);
  if (existingUser) {
    return existingUser;
  }

  const userName = await userService.generateUniqueUsername(email);
  const randomPassword = await bcrypt.hash(
    crypto.randomBytes(20).toString("hex"),
    SALT_ROUNDS,
  );

  const UserModel = getUserModel(userType);
  return UserModel.create({
    email,
    name,
    userName,
    password: randomPassword,
  });
}
