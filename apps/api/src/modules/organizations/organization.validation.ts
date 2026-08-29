import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { ORGANIZATION_DOMAINS, ORGANIZATION_TAGS } from "./organization.taxonomy";

export const listOrganizationsQuerySchema = z
  .object({
    /**
     * Kept for backwards compatibility: `GET /organizations?userName=` is
     * still the lookup `Profile.tsx` uses for an account page, and still
     * answers out of the users collection. Everything else on this route
     * now reads the organizations collection. See organizations.md.
     */
    userName: z.string().optional(),
    search: z.string().trim().min(1).optional(),
    tag: z.enum(ORGANIZATION_TAGS).optional(),
    domain: z.enum(ORGANIZATION_DOMAINS).optional(),
  })
  .merge(paginationQuerySchema);

export const organizationHandleParamSchema = z.object({
  handle: z.string().trim().min(1),
});

/**
 * Every field an organization can set about itself. All optional — the
 * setup form saves whatever the user has filled in so far, and going live
 * is decided by `missingRequiredFields()` (organization.service.ts), not
 * by this schema rejecting a half-finished save. `status`, `verified`,
 * `followers`, `handle` and `ownerEmail` are absent on purpose: none of
 * them are the organization's to set.
 */
export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    tag: z.enum(ORGANIZATION_TAGS).optional(),
    domains: z.array(z.enum(ORGANIZATION_DOMAINS)).max(5).optional(),
    description: z.string().trim().max(4000).optional(),
    teamSize: z.coerce.number().int().min(1).max(1000000).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    website: z.string().trim().url().or(z.literal("")).optional(),
    contactEmail: z.string().trim().email().or(z.literal("")).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    logo: z.string().trim().max(2000).optional(),
    cover: z.string().trim().max(2000).optional(),
    gallery: z.array(z.string().trim().max(2000)).max(12).optional(),
    fundsRaised: z.coerce.number().min(0).optional(),
    fundsGoal: z.coerce.number().min(0).optional(),
  })
  .strict();

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
export type OrganizationHandleParam = z.infer<typeof organizationHandleParamSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
