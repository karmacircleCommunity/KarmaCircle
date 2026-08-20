import { IUser, User, UserType } from "./user.model";
import { CompleteProfileInput, UpdateProfileInput } from "./user.validation";

interface Page<T> {
  data: T[];
  total: number;
}

const PUBLIC_FIELDS = "-password -__v -tokenVersion";

export async function generateUniqueUsername(email: string): Promise<string> {
  let userName = email.split("@")[0];

  while (await User.findOne({ userName })) {
    userName = `${email.split("@")[0]}${Math.floor(Math.random() * 10000)}`;
  }

  return userName;
}

export async function findByEmail(email: string) {
  return User.findOne({ email });
}

export async function findByUsername(userName: string) {
  return User.findOne({ userName }).select(PUBLIC_FIELDS);
}

const INDIVIDUAL: UserType = "individual";

export async function findIndividuals(pagination: {
  skip: number;
  limit: number;
}): Promise<Page<IUser>> {
  const filter = { userType: INDIVIDUAL };
  const [data, total] = await Promise.all([
    User.find(filter)
      .select(PUBLIC_FIELDS)
      .skip(pagination.skip)
      .limit(pagination.limit),
    User.countDocuments(filter),
  ]);
  return { data, total };
}

export async function findAll(pagination: {
  skip: number;
  limit: number;
}): Promise<Page<IUser>> {
  const [data, total] = await Promise.all([
    User.find({})
      .select(PUBLIC_FIELDS)
      .skip(pagination.skip)
      .limit(pagination.limit),
    User.countDocuments({}),
  ]);
  return { data, total };
}

export async function findByType(
  userType: UserType,
  pagination: { skip: number; limit: number },
): Promise<Page<IUser>> {
  const filter = { userType };
  const [data, total] = await Promise.all([
    User.find(filter)
      .select(PUBLIC_FIELDS)
      .skip(pagination.skip)
      .limit(pagination.limit),
    User.countDocuments(filter),
  ]);
  return { data, total };
}

/**
 * `coverImage` is the field name both frontend profile forms send;
 * `IUser` has no such field, only `bannerPicture` (the large top-of-
 * profile image `coverImage` is describing) — translate it here so the
 * request/response boundary can use the frontend's name without the
 * schema needing to match it. See user.validation.ts's updateProfileSchema.
 */
function toUserUpdate(data: UpdateProfileInput) {
  const { coverImage, ...rest } = data;
  return {
    ...rest,
    ...(coverImage !== undefined && { bannerPicture: coverImage }),
  };
}

export async function updateProfile(email: string, data: UpdateProfileInput) {
  return User.findOneAndUpdate(
    { email },
    { $set: toUserUpdate(data) },
    { new: true },
  ).select(PUBLIC_FIELDS);
}

/**
 * PATCH /user/complete — same field set as updateProfile, but always
 * flips config.hasCompletedProfile to true server-side, independent of
 * whatever the client's body claims about it (see completeProfileSchema
 * in user.validation.ts) — the server owns this invariant, not the caller.
 */
export async function completeProfile(
  email: string,
  data: CompleteProfileInput,
) {
  return User.findOneAndUpdate(
    { email },
    { $set: { ...toUserUpdate(data), "config.hasCompletedProfile": true } },
    { new: true },
  ).select(PUBLIC_FIELDS);
}

export function sanitize(user: IUser) {
  const { password, _id, __v, tokenVersion, ...rest } = user.toObject();
  return rest;
}
