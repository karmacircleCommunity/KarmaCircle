import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const listProductsQuerySchema = paginationQuerySchema;

export const addProductSchema = z.object({
  productType: z.string().min(1),
  productName: z.string().min(1),
  productPrice: z.number().nonnegative(),
  productDescription: z.string().min(1),
  productImage: z.string().min(1),
  productQty: z.number().nonnegative(),
  productSlug: z.string().min(1),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1),
});

export type AddProductInput = z.infer<typeof addProductSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
