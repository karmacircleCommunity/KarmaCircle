import { z } from "zod";

/**
 * Merge this into a module's list-query Zod schema (`.merge(paginationQuerySchema)`)
 * to accept `?page=&limit=` on any "list everything" endpoint. `limit` is capped at
 * 100 so a caller can't request an unbounded page size and defeat the point of
 * paginating in the first place.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function toSkipLimit({ page, limit }: PaginationQuery): {
  skip: number;
  limit: number;
} {
  return { skip: (page - 1) * limit, limit };
}

export function buildPaginationMeta({
  page,
  limit,
  total,
}: PaginationQuery & { total: number }): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
