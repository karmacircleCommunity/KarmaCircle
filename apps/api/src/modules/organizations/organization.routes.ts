import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as organizationController from "./organization.controller";
import {
  listOrganizationsQuerySchema,
  organizationHandleParamSchema,
  updateOrganizationSchema,
} from "./organization.validation";

const router = Router();

/**
 * @openapi
 * /organizations:
 *   get:
 *     summary: List live organizations (paginated, filterable), or look up an account by username
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: userName
 *         schema: { type: string }
 *         description: Legacy account lookup — answers out of the users collection
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *       - in: query
 *         name: domain
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "A single account (if userName is set), or { data, pagination } of public organizations" }
 *       404: { description: Not found }
 */
router.get(
  "/",
  validate(listOrganizationsQuerySchema, "query"),
  asyncHandler(organizationController.listOrganizations),
);

/**
 * @openapi
 * /organizations/taxonomy:
 *   get:
 *     summary: The closed lists of tags and domains an organization can pick from
 *     tags: [Organizations]
 *     responses:
 *       200: { description: "{ tags, domains }" }
 */
router.get("/taxonomy", asyncHandler(organizationController.taxonomy));

/**
 * @openapi
 * /organizations/me:
 *   get:
 *     summary: The authenticated organization's own record, private fields included
 *     tags: [Organizations]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: The organization, with missingFields and status }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization account }
 *   patch:
 *     summary: Update the authenticated organization, publishing it once complete
 *     tags: [Organizations]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: The updated organization }
 *       400: { description: Validation failed }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization account }
 */
router.get(
  "/me",
  requireAuth,
  asyncHandler<AuthenticatedRequest>(organizationController.getMine),
);

router.patch(
  "/me",
  requireAuth,
  validate(updateOrganizationSchema),
  asyncHandler<AuthenticatedRequest>(organizationController.updateMine),
);

/**
 * @openapi
 * /organizations/dashboard:
 *   get:
 *     summary: Get the authenticated organization's own dashboard data
 *     tags: [Organizations]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Dashboard data }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.get(
  "/dashboard",
  requireAuth,
  asyncHandler<AuthenticatedRequest>(organizationController.dashboard),
);

/**
 * @openapi
 * /organizations/{handle}:
 *   get:
 *     summary: One live organization's public profile
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: handle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The public organization }
 *       404: { description: Unknown handle, or the organization is still in draft }
 */
// Declared last on purpose: "/taxonomy", "/me" and "/dashboard" would all
// match this wildcard, and Express takes the first route that matches.
router.get(
  "/:handle",
  validate(organizationHandleParamSchema, "params"),
  asyncHandler(organizationController.getByHandle),
);

export default router;
