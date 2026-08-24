import { Router } from "express";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as directoryController from "./directory.controller";
import { listDirectoryQuerySchema } from "./directory.validation";

const router = Router();

/**
 * @openapi
 * /display/users:
 *   get:
 *     summary: List all users in the public directory (paginated)
 *     tags: [Directory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "{ data, pagination }" }
 */
router.get(
  "/users",
  validate(listDirectoryQuerySchema, "query"),
  asyncHandler(directoryController.listAllUsers),
);

/**
 * @openapi
 * /display/organizations:
 *   get:
 *     summary: List all organizations in the public directory (paginated)
 *     tags: [Directory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "{ data, pagination }" }
 */
router.get(
  "/organizations",
  validate(listDirectoryQuerySchema, "query"),
  asyncHandler(directoryController.listOrganizations),
);

export default router;
