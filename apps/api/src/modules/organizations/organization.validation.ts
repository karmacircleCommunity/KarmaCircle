import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const listOrganizationsQuerySchema = z
  .object({
    userName: z.string().optional(),
  })
  .merge(paginationQuerySchema);

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
