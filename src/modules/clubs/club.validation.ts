import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const listClubsQuerySchema = z
  .object({
    userName: z.string().optional(),
  })
  .merge(paginationQuerySchema);

export type ListClubsQuery = z.infer<typeof listClubsQuerySchema>;
