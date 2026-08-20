import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as productController from "./product.controller";
import {
  addProductSchema,
  addToCartSchema,
  listProductsQuerySchema,
} from "./product.validation";

const router = Router();

/**
 * @openapi
 * /product/addproduct:
 *   post:
 *     summary: Add a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productType, productName, productPrice, productDescription, productImage, productQty, productSlug]
 *             properties:
 *               productType: { type: string }
 *               productName: { type: string }
 *               productPrice: { type: number }
 *               productDescription: { type: string }
 *               productImage: { type: string }
 *               productQty: { type: number }
 *               productSlug: { type: string }
 *     responses:
 *       201: { description: Product created }
 *       409: { description: productSlug already exists }
 */
router.post(
  "/addproduct",
  validate(addProductSchema),
  asyncHandler(productController.addProduct),
);

/**
 * @openapi
 * /product/allproducts:
 *   get:
 *     summary: List all products (paginated)
 *     tags: [Products]
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
  "/allproducts",
  validate(listProductsQuerySchema, "query"),
  asyncHandler(productController.listProducts),
);

/**
 * @openapi
 * /product/cart/add:
 *   post:
 *     summary: Add a product to the authenticated user's own cart
 *     tags: [Products]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *     responses:
 *       200: { description: Product added to cart }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.post(
  "/cart/add",
  requireAuth,
  validate(addToCartSchema),
  asyncHandler<AuthenticatedRequest>(productController.addToCart),
);

/**
 * @openapi
 * /product/{productSlug}:
 *   get:
 *     summary: Get a product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productSlug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product found }
 *       404: { description: Product not found }
 */
router.get("/:productSlug", asyncHandler(productController.getProduct));

export default router;
