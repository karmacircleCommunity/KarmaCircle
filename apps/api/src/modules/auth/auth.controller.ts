import { Request, Response } from "express";
import { env } from "../../config/env";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { IUser } from "../users/user.model";
import * as userService from "../users/user.service";
import * as authService from "./auth.service";
import {
  clearedCookieOptions,
  httpOnlyCookieOptions,
  readableCookieOptions,
} from "./auth.cookies";
import {
  CheckEmailInput,
  SigninInput,
  SignupInput,
  UpdatePasswordInput,
} from "./auth.validation";

export async function signup(req: Request, res: Response) {
  const { token, user } = await authService.signup(req.body as SignupInput);

  res
    .status(STATUS_CODE.CREATED)
    .cookie("Token", token, readableCookieOptions())
    .json({
      message: STATUS_MESSAGE.SIGNUP_SUCCESS,
      user,
    });
}

export async function signin(req: Request, res: Response) {
  const { email, password } = req.body as SigninInput;
  const { token, user } = await authService.signin(email, password);

  res
    .status(STATUS_CODE.OK)
    .cookie("Token", token, readableCookieOptions())
    .json({
      message: STATUS_MESSAGE.LOGIN_SUCCESS,
      user,
    });
}

/**
 * Lets the signup form ask "does this email already have an account" as
 * soon as the user types it, before they invest time in a name/password,
 * rather than only finding out via signup's own 409 at the very end.
 * Deliberately reveals only a boolean, not the account's own data, and
 * sits behind `authLimiter` like every other route here — the same
 * "does this email exist" signal is already reachable via signup's 409,
 * so this doesn't open a new information leak, only surfaces it earlier.
 */
export async function checkEmail(req: Request, res: Response) {
  const { email } = req.query as unknown as CheckEmailInput;
  const exists = await authService.emailExists(email);

  res.status(STATUS_CODE.OK).json({ exists });
}

export async function updatePassword(req: Request, res: Response) {
  const { email, oldPassword, newPassword } = req.body as UpdatePasswordInput;
  await authService.updatePassword(email, oldPassword, newPassword);

  res
    .status(STATUS_CODE.CREATED)
    .json({ message: STATUS_MESSAGE.PASSWORD_UPDATE_SUCCESS });
}

export function googleInitiate(req: Request, res: Response) {
  const googleAuthURL = "https://accounts.google.com/o/oauth2/v2/auth";

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: env.CALLBACK_URL,
    scope: "profile email ",
    client_id: env.CLIENT_ID,
    state: typeof req.query.userType === "string" ? req.query.userType : "",
  });

  res.status(STATUS_CODE.CREATED).json({ url: `${googleAuthURL}?${params}` });
}

/**
 * Sets the actual session cookies (Token + the readable userName/
 * isLoggedIn/userType trio the frontend reads directly) for a
 * successfully-authenticated Google user. Called from `googleCallback`
 * — the *only* request in this handshake that ever has a real `req.user`
 * from Passport, since `session: false` means nothing carries it forward
 * to the later `/auth/login/success` request. See `loginSuccess` below.
 */
function issueOAuthSession(res: Response, user: IUser): Response {
  const token = authService.signToken(user.email, user.tokenVersion);
  return res
    .cookie("Token", token, httpOnlyCookieOptions())
    .cookie("userName", user.userName, readableCookieOptions())
    .cookie("isLoggedIn", true, readableCookieOptions())
    .cookie("userType", "user", readableCookieOptions());
}

export function googleCallback(req: Request, res: Response): void {
  if (!req.isAuthenticated() || !req.user) {
    res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ error: true, message: STATUS_MESSAGE.UNAUTHORIZED });
    return;
  }

  issueOAuthSession(res, req.user as IUser)
    .cookie("OAuthLoginInitiated", true, {
      expires: new Date(Date.now() + 5 * 60 * 1000),
      httpOnly: false,
      secure: true,
      sameSite: "none",
      domain: env.ORIGIN_DOMAIN,
    })
    .redirect(env.successURL);
}

export function loginFailed(_req: Request, res: Response) {
  res
    .status(STATUS_CODE.UNAUTHORIZED)
    .json({ error: true, message: STATUS_MESSAGE.UNAUTHORIZED });
}

/**
 * The frontend's landing page calls this right after the OAuth redirect
 * completes, as a *separate* request from the one `googleCallback`
 * handled — so it can't rely on Passport's `req.user` (see
 * `issueOAuthSession` above). Instead it's gated by the same `requireAuth`
 * every other session-authenticated route uses, reading the `Token`
 * cookie `googleCallback` already set on the redirect response. Was
 * previously unreachable (`req.user` was always undefined here); see
 * api-contract.md's former "GET /auth/login/success likely can't
 * complete Google OAuth" entry.
 */
export async function loginSuccess(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const user = await userService.findByEmail(req.auth.email);

  if (!user) {
    res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ error: true, message: STATUS_MESSAGE.UNAUTHORIZED });
    return;
  }

  res
    .status(STATUS_CODE.OK)
    .cookie("OAuthLoginInitiated", false, clearedCookieOptions(false))
    .json({
      message: STATUS_MESSAGE.LOGIN_SUCCESS,
      user: userService.sanitize(user),
    });
}

export async function logout(req: Request, res: Response) {
  // Best-effort revocation: if this cookie decodes to a real session, kill
  // it server-side too, not just on the client. A missing/expired/garbage
  // token is not an error here — logout always succeeds either way.
  const decoded = authService.verifyTokenLoosely(req.cookies?.Token);
  if (decoded) {
    await authService.bumpTokenVersion(decoded.email);
  }

  res
    .status(STATUS_CODE.OK)
    .cookie("Token", false, clearedCookieOptions(true))
    .cookie("userName", false, clearedCookieOptions(false))
    .cookie("isLoggedIn", false, clearedCookieOptions(false))
    .cookie("userType", false, clearedCookieOptions(false))
    .json({ message: STATUS_MESSAGE.LOGOUT_SUCCESS });
}
