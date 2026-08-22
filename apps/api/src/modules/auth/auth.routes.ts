import { Router } from "express";
import passport from "../../config/passport";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as authController from "./auth.controller";
import {
  signinSchema,
  signupSchema,
  updatePasswordSchema,
} from "./auth.validation";

const router = Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Create an account with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       201: { description: Signed up, Token cookie set }
 *       409: { description: User already exists }
 */
router.post(
  "/signup",
  authLimiter,
  validate(signupSchema),
  asyncHandler(authController.signup),
);

/**
 * @openapi
 * /auth/signin:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in, Token cookie set }
 *       401: { description: Invalid credentials }
 */
router.post(
  "/signin",
  authLimiter,
  validate(signinSchema),
  asyncHandler(authController.signin),
);

/**
 * @openapi
 * /auth/update:
 *   post:
 *     summary: Change the password for an account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, oldPassword, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               oldPassword: { type: string }
 *               newPassword: { type: string, minLength: 5 }
 *     responses:
 *       201: { description: Password updated }
 *       401: { description: Old password incorrect }
 *       404: { description: User not found }
 */
router.post(
  "/update",
  authLimiter,
  validate(updatePasswordSchema),
  asyncHandler(authController.updatePassword),
);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Get the Google OAuth redirect URL
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: userType
 *         schema: { type: string }
 *     responses:
 *       201: { description: Redirect URL generated }
 */
router.get("/google", authController.googleInitiate);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302: { description: Redirect to the frontend success URL }
 *       401: { description: Unauthorized }
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "auth/login/failed",
  }),
  authController.googleCallback,
);

/**
 * @openapi
 * /auth/login/failed:
 *   get:
 *     summary: OAuth login failure landing route
 *     tags: [Auth]
 *     responses:
 *       401: { description: Unauthorized }
 */
router.get("/login/failed", authController.loginFailed);

/**
 * @openapi
 * /auth/login/success:
 *   get:
 *     summary: OAuth login success landing route — reads back the Token cookie googleCallback already set
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Unauthorized }
 */
router.get(
  "/login/success",
  requireAuth,
  asyncHandler<AuthenticatedRequest>(authController.loginSuccess),
);

/**
 * @openapi
 * /auth/logout:
 *   get:
 *     summary: Clear auth cookies
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out }
 */
router.get("/logout", asyncHandler(authController.logout));

export default router;
