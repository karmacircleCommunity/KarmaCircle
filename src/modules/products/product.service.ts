import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { User } from "../users/user.model";
import { IProduct, Product } from "./product.model";
import { AddProductInput } from "./product.validation";

export async function addProduct(data: AddProductInput): Promise<IProduct> {
  const existingSlug = await Product.findOne({ productSlug: data.productSlug });
  if (existingSlug) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      STATUS_MESSAGE.PRODUCT_SLUG_ALREADY_EXISTS,
    );
  }

  const product = new Product(data);
  return product.save();
}

export async function findAll(pagination: { skip: number; limit: number }) {
  const [data, total] = await Promise.all([
    Product.find().skip(pagination.skip).limit(pagination.limit),
    Product.countDocuments(),
  ]);
  return { data, total };
}

export async function findBySlug(productSlug: string) {
  return Product.findOne({ productSlug });
}

export async function addToCart(
  email: string,
  productId: string,
): Promise<boolean> {
  const response = await User.updateOne(
    { email },
    { $push: { cart: { id: productId } } },
  );
  return response.modifiedCount === 1;
}
