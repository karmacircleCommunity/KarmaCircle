import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as productService from "./product.service";
import {
  AddProductInput,
  AddToCartInput,
  ListProductsQuery,
} from "./product.validation";

export async function addProduct(req: Request, res: Response) {
  const savedProduct = await productService.addProduct(
    req.body as AddProductInput,
  );
  res.status(STATUS_CODE.CREATED).json(savedProduct);
}

export async function listProducts(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as ListProductsQuery;
  const { data, total } = await productService.findAll(
    toSkipLimit({ page, limit }),
  );
  res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
}

export async function getProduct(req: Request, res: Response) {
  const { productSlug } = req.params;
  const product = await productService.findBySlug(productSlug);

  if (!product) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.PRODUCT_NOT_FOUND);
  }

  res.status(STATUS_CODE.OK).json(product);
}

export async function addToCart(req: AuthenticatedRequest, res: Response) {
  const { productId } = req.body as AddToCartInput;
  const added = await productService.addToCart(req.auth.email, productId);

  if (!added) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.USER_NOT_FOUND);
  }

  res.send("Product added successfully");
}
