import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as userController from "./user.controller";
import {
  completeProfileSchema,
  listUsersQuerySchema,
  updateProfileSchema,
} from "./user.validation";

const router = Router();

/**
 * @openapi
 * /user:
 *   get:
 *     summary: Get a user by username, or list individual users (paginated)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: userName
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "A single user (if userName is set), or { data, pagination } otherwise" }
 *       404: { description: Not found }
 */
router.get(
  "/",
  validate(listUsersQuerySchema, "query"),
  asyncHandler(userController.listUsers),
);

/**
 * @openapi
 * /user/profile:
 *   get:
 *     summary: Get the authenticated user's own profile record
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ user }" }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.get(
  "/profile",
  requireAuth,
  asyncHandler<AuthenticatedRequest>(userController.profile),
);

/**
 * @openapi
 * /user/update:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               coverImage: { type: string }
 *               address:
 *                 type: object
 *                 properties:
 *                   line1: { type: string }
 *                   line2: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   country: { type: string }
 *                   pincode: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.patch(
  "/update",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler<AuthenticatedRequest>(userController.updateProfile),
);

/**
 * @openapi
 * /user/complete:
 *   patch:
 *     summary: Complete the authenticated user's profile (sets config.hasCompletedProfile)
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               coverImage: { type: string }
 *               address:
 *                 type: object
 *                 properties:
 *                   line1: { type: string }
 *                   line2: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   country: { type: string }
 *                   pincode: { type: string }
 *     responses:
 *       200: { description: Profile completed }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.patch(
  "/complete",
  requireAuth,
  validate(completeProfileSchema),
  asyncHandler<AuthenticatedRequest>(userController.completeProfile),
);

export default router;
