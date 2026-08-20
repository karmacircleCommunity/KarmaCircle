import { z } from "zod";

export const createOrderSchema = z.object({
  amount: z.number().positive(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
