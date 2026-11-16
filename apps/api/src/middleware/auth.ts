import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { STATUS_CODE, STATUS_MESSAGE } from "../constants/http-status";
import { User } from "../modules/users/user.model";

interface TokenPayload {
  User: { id: string };
  tokenVersion: number;
}

/**
 * Request shape after requireAuth has run: `auth` is guaranteed present,
 * so handlers typed against this don't need a `req.auth!` assertion.
 * Pair with asyncHandler<AuthenticatedRequest>(...) in the route file.
 */
export interface AuthenticatedRequest extends Request {
  auth: { email: string };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const unauthorized = () => {
    res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ message: STATUS_MESSAGE.UNAUTHORIZED });
  };

  const token = req.cookies?.Token;

  if (!token) {
    unauthorized();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    // Revocation check: a logout or password change bumps the user's
    // tokenVersion (see auth.service.ts), which immediately invalidates
    // every token signed before that point, not just ones that have
    // naturally expired. This is the one DB read on every authenticated
    // request — the deliberate trade-off for being able to actually kill
    // a session instead of waiting out its JWT expiry.
    const user = await User.findOne({ email: decoded.User.id }).select(
      "tokenVersion",
    );
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      unauthorized();
      return;
    }

    req.auth = { email: decoded.User.id };
    next();
  } catch {
    unauthorized();
  }
}

/**
 * Like `requireAuth`, but never rejects: a valid `Token` cookie sets
 * `req.auth`, anything else leaves it unset and the request carries on as a
 * visitor. For public routes that show a little more to the signed-in owner
 * (an organization sees its own drafts, PG-15). Same revocation check as
 * `requireAuth`, so a logged-out session does not count.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.Token;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      const user = await User.findOne({ email: decoded.User.id }).select(
        "tokenVersion",
      );
      if (user && user.tokenVersion === decoded.tokenVersion) {
        (req as Request & { auth?: { email: string } }).auth = {
          email: decoded.User.id,
        };
      }
    } catch {
      // An invalid or expired token is just a visitor here.
    }
  }
  next();
}
