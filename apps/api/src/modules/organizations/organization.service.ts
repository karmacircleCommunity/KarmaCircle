import { FilterQuery } from "mongoose";
import {
  IOrganization,
  MEMBER_ROLE,
  ORGANIZATION_STATUS,
  Organization,
} from "./organization.model";
import { UpdateOrganizationInput } from "./organization.validation";

interface Page<T> {
  data: T[];
  total: number;
}

/**
 * What an organization must fill in before anyone else can see it. Keeping
 * this as one list — rather than `required: true` on the schema — is what
 * lets the setup form save partial progress while the record stays in
 * draft; the same list drives the checklist the form renders.
 *
 * A logo is deliberately NOT on it: there is no upload endpoint yet, so
 * requiring one would gate every organization behind a field it has no way
 * to fill. The profile falls back to a monogram until then.
 */
export const REQUIRED_FIELDS = [
  "description",
  "tag",
  "domains",
  "teamSize",
  "city",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export function missingRequiredFields(
  organization: IOrganization,
): RequiredField[] {
  const missing: RequiredField[] = [];

  if (!organization.description?.trim()) missing.push("description");
  if (!organization.tag) missing.push("tag");
  if (!organization.domains?.length) missing.push("domains");
  if (!organization.teamSize) missing.push("teamSize");
  if (!organization.location?.city?.trim()) missing.push("city");

  return missing;
}

/**
 * The shape a visitor gets. Anything an organization would not want on a
 * public page — who owns the login, who its members are, its private
 * phone — is dropped here rather than at each call site, so a new public
 * route can't leak by forgetting to filter.
 */
export function toPublic(organization: IOrganization) {
  return {
    id: String(organization._id),
    handle: organization.handle,
    name: organization.name,
    tag: organization.tag,
    domains: organization.domains ?? [],
    description: organization.description,
    teamSize: organization.teamSize,
    location: {
      city: organization.location?.city,
      state: organization.location?.state,
    },
    website: organization.website,
    contactEmail: organization.contactEmail,
    logo: organization.logo,
    cover: organization.cover,
    gallery: organization.gallery ?? [],
    fundsRaised: organization.fundsRaised,
    fundsGoal: organization.fundsGoal,
    followers: organization.followers ?? 0,
    verified: organization.verified,
    createdAt: organization.createdAt,
  };
}

/**
 * The owner's own view: everything public, plus the private fields and the
 * two derived values the setup form needs to render its checklist.
 */
export function toPrivate(organization: IOrganization) {
  const missingFields = missingRequiredFields(organization);

  return {
    ...toPublic(organization),
    ownerEmail: organization.ownerEmail,
    contactPhone: organization.contactPhone,
    members: organization.members ?? [],
    status: organization.status,
    missingFields,
    isLive: organization.status === ORGANIZATION_STATUS.Live,
  };
}

export async function findByOwnerEmail(email: string) {
  return Organization.findOne({ ownerEmail: email });
}

export async function findLiveByHandle(handle: string) {
  return Organization.findOne({
    handle,
    status: ORGANIZATION_STATUS.Live,
  });
}

export async function createForOwner(input: {
  ownerEmail: string;
  handle: string;
  name: string;
}) {
  return Organization.create({
    ...input,
    status: ORGANIZATION_STATUS.Draft,
    members: [
      {
        email: input.ownerEmail,
        role: MEMBER_ROLE.Owner,
        addedAt: new Date(),
      },
    ],
  });
}

/**
 * Reads the caller's organization, creating it first if the account
 * predates this collection. Without this backfill every organization that
 * signed up before the split would hit its own setup form and get a 404
 * it could never clear.
 */
export async function findOrCreateForOwner(owner: {
  email: string;
  userName: string;
  name?: string;
}) {
  const existing = await findByOwnerEmail(owner.email);
  if (existing) {
    return existing;
  }

  return createForOwner({
    ownerEmail: owner.email,
    handle: owner.userName,
    name: owner.name?.trim() || owner.userName,
  });
}

function toUpdate(data: UpdateOrganizationInput) {
  const { city, state, ...rest } = data;

  return {
    ...rest,
    ...(city !== undefined && { "location.city": city }),
    ...(state !== undefined && { "location.state": state }),
  };
}

/**
 * Saves whatever the setup form sent, then re-checks the required list and
 * publishes the organization the moment it is complete. The transition is
 * one-way here: a live organization that later blanks a required field is
 * left live rather than being yanked out of the directory mid-edit, which
 * would break every link to it. (A deliberate unpublish is a separate,
 * not-yet-built action.)
 */
export async function updateForOwner(
  organization: IOrganization,
  data: UpdateOrganizationInput,
) {
  organization.set(toUpdate(data));

  if (
    organization.status === ORGANIZATION_STATUS.Draft &&
    missingRequiredFields(organization).length === 0
  ) {
    organization.status = ORGANIZATION_STATUS.Live;
  }

  await organization.save();
  return organization;
}

export async function findLive(
  filters: { search?: string; tag?: string; domain?: string },
  pagination: { skip: number; limit: number },
): Promise<Page<IOrganization>> {
  const query: FilterQuery<IOrganization> = {
    status: ORGANIZATION_STATUS.Live,
  };

  if (filters.tag) {
    query.tag = filters.tag;
  }
  if (filters.domain) {
    query.domains = filters.domain;
  }
  if (filters.search) {
    // A case-insensitive regex rather than the text index, so a partial
    // word ("kolk") still matches — the directory's search box filters as
    // you type, where whole-word text search would look broken.
    const term = new RegExp(
      filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    query.$or = [
      { name: term },
      { description: term },
      { "location.city": term },
    ];
  }

  const [data, total] = await Promise.all([
    Organization.find(query)
      .sort({ verified: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Organization.countDocuments(query),
  ]);

  return { data, total };
}
