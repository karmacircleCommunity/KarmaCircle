import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { IUser, User, getUserModel } from "../users/user.model";
import * as userService from "../users/user.service";
import { THIRTY_DAYS_MS } from "./auth.cookies";
import { SignupInput } from "./auth.validation";

const SALT_ROUNDS = 10;

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
  await existingUser.save();
}

export async function emailExists(email: string): Promise<boolean> {
  const existingUser = await userService.findByEmail(email);
  return existingUser !== null;
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
