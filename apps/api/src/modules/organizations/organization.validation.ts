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
/**
 * A phone number as people write one: digits, an optional leading `+`, and
 * the separators keyboards offer (space, dash, dot, brackets). Between 7
 * and 15 digits - the shortest real subscriber number, and E.164's ceiling.
 *
 * The web form checks the same shape before it saves
 * (`validateSetupField`), but the rule lives here too: this route is the
 * only thing standing between a direct PATCH and a profile whose one
 * contact detail is unusable.
 */
const CONTACT_PHONE = /^\+?[0-9 ()\-.]{6,29}$/;
const CONTACT_PHONE_DIGITS = /^\D*(?:\d\D*){7,15}$/;

/** An empty string is a save (clearing the field), same escape hatch every
 *  other optional URL field on this schema already uses. */
const optionalUrl = () => z.string().trim().url().or(z.literal(""));

const socialLinksSchema = z
  .object({
    instagram: optionalUrl().optional(),
    facebook: optionalUrl().optional(),
    twitter: optionalUrl().optional(),
    linkedin: optionalUrl().optional(),
    youtube: optionalUrl().optional(),
  })
  .strict();

/**
 * One public "Our team" entry. Deliberately separate from anything on
 * `members` (organization.model.ts) — this is display copy, not a
 * permissions grant, so it has no `email`/`role` and no auth implication.
 */
const leaderSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(80),
    photo: z.string().trim().max(2000).optional(),
    bio: z.string().trim().max(300).optional(),
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    tag: z.enum(ORGANIZATION_TAGS).optional(),
    domains: z.array(z.enum(ORGANIZATION_DOMAINS)).max(5).optional(),
    description: z.string().trim().max(500).optional(),
    teamSize: z.coerce.number().int().min(1).max(1000000).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    address: z.string().trim().max(200).optional(),
    mapIframe: z.string().trim().max(2000).optional(),
    website: z.string().trim().url().or(z.literal("")).optional(),
    contactEmail: z.string().trim().email().or(z.literal("")).optional(),
    contactPhone: z
      .string()
      .trim()
      .max(30)
      .regex(CONTACT_PHONE, "contactPhone must be a phone number")
      .regex(CONTACT_PHONE_DIGITS, "contactPhone must have 7 to 15 digits")
      .or(z.literal(""))
      .optional(),
    logo: z.string().trim().max(2000).optional(),
    cover: z.string().trim().max(2000).optional(),
    gallery: z.array(z.string().trim().max(2000)).max(12).optional(),
    socialLinks: socialLinksSchema.optional(),
    // Capped at 8, same reasoning as `domains`' cap of 5: a list that keeps
    // growing without bound is how a "team" section turns into a wall.
    leadership: z.array(leaderSchema).max(8).optional(),
    sponsorship: z.object({ enabled: z.boolean() }).strict().optional(),
    fundsRaised: z.coerce.number().min(0).optional(),
    fundsGoal: z.coerce.number().min(0).optional(),
  })
  .strict();

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
export type OrganizationHandleParam = z.infer<typeof organizationHandleParamSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
