import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  id?: string;
  productType: string;
  productName: string;
  productPrice: number;
  productDescription: string;
  productImage: string;
  productQty: number;
  productSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    productType: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    productDescription: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
      required: true,
    },
    productQty: {
      type: Number,
      required: true,
    },
    productSlug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model<IProduct>("Products", productSchema);
