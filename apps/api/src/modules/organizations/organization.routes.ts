import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as organizationController from "./organization.controller";
import { listOrganizationsQuerySchema } from "./organization.validation";

const router = Router();

/**
 * @openapi
 * /organizations:
 *   get:
 *     summary: Get an organization by username, or list all organizations (paginated)
 *     tags: [Organizations]
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
 *       200: { description: "A single organization (if userName is set), or { data, pagination } otherwise" }
 *       404: { description: Not found }
 */
router.get(
  "/",
  validate(listOrganizationsQuerySchema, "query"),
  asyncHandler(organizationController.listOrganizations),
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

export default router;
