import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

// Nested address shape, matching IUser.address on the Mongoose schema
// (and, not coincidentally, exactly what the frontend's ProfileUpdate.tsx/
// useProfileCompletion.ts forms already send) — see api-contract.md's
// former "body shape doesn't match the User.address schema" entry.
const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  // Maps onto IUser.bannerPicture — "coverImage" is the field name the
  // frontend's upload UI (and both profile forms) use for that image;
  // see user.service.ts's updateProfile for the translation.
  coverImage: z.string().optional(),
  address: addressSchema.optional(),
});

// Shared by PATCH /user/complete — same fields, plus flipping
// config.hasCompletedProfile, which the service always does server-side
// regardless of whether the client's body claims it.
export const completeProfileSchema = updateProfileSchema;

export const listUsersQuerySchema = z
  .object({
    userName: z.string().optional(),
  })
  .merge(paginationQuerySchema);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
