import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as userService from "../users/user.service";
import * as organizationService from "./organization.service";
import {
  ORGANIZATION_DOMAINS,
  ORGANIZATION_TAGS,
} from "./organization.taxonomy";
import {
  ListOrganizationsQuery,
  OrganizationHandleParam,
  UpdateOrganizationInput,
} from "./organization.validation";

export async function listOrganizations(req: Request, res: Response) {
  const { userName, search, tag, domain, page, limit } =
    req.query as unknown as ListOrganizationsQuery;

  // Unchanged legacy branch — an account lookup by username, still served
  // out of the users collection. See organization.validation.ts.
  if (userName) {
    const organization = await userService.findByUsername(userName);

    if (!organization) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res.status(STATUS_CODE.OK).json(organization);
  }

  const { data, total } = await organizationService.findLive(
    { search, tag, domain },
    toSkipLimit({ page, limit }),
  );

  return res.status(STATUS_CODE.OK).json({
    data: data.map(organizationService.toPublic),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
}

export async function taxonomy(_req: Request, res: Response) {
  return res.status(STATUS_CODE.OK).json({
    tags: ORGANIZATION_TAGS,
    domains: ORGANIZATION_DOMAINS,
  });
}

/**
 * The organization's own record, private fields included. Backfills the
 * record for accounts that predate the organizations collection — see
 * organization.service.ts's findOrCreateForOwner.
 */
export async function getMine(req: AuthenticatedRequest, res: Response) {
  const user = await userService.findByEmail(req.auth.email);

  if (!user) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.USER_NOT_FOUND);
  }

  if (user.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  const organization = await organizationService.findOrCreateForOwner({
    email: user.email,
    userName: user.userName,
    name: user.name,
  });

  return res
    .status(STATUS_CODE.OK)
    .json(organizationService.toPrivate(organization));
}

export async function updateMine(req: AuthenticatedRequest, res: Response) {
  const user = await userService.findByEmail(req.auth.email);

  if (!user) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.USER_NOT_FOUND);
  }

  if (user.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  const organization = await organizationService.findOrCreateForOwner({
    email: user.email,
    userName: user.userName,
    name: user.name,
  });

  const updated = await organizationService.updateForOwner(
    organization,
    req.body as UpdateOrganizationInput,
  );

  return res.status(STATUS_CODE.OK).json({
    message: STATUS_MESSAGE.ORGANIZATION_UPDATE_SUCCESS,
    organization: organizationService.toPrivate(updated),
  });
}

/**
 * The public profile. Draft organizations 404 here exactly as an unknown
 * handle does — a visitor must not be able to tell the difference, or the
 * "hidden until complete" rule leaks the existence of every half-finished
 * signup.
 */
export async function getByHandle(req: Request, res: Response) {
  const { handle } = req.params as unknown as OrganizationHandleParam;
  const organization = await organizationService.findLiveByHandle(handle);

  if (!organization) {
    throw new AppError(
      STATUS_CODE.NOT_FOUND,
      STATUS_MESSAGE.ORGANIZATION_NOT_FOUND,
    );
  }

  return res
    .status(STATUS_CODE.OK)
    .json(organizationService.toPublic(organization));
}

export async function dashboard(req: AuthenticatedRequest, res: Response) {
  const email = req.auth.email;
  const user = await userService.findByEmail(email);

  if (!user) {
    throw new AppError(
      STATUS_CODE.NOT_FOUND,
      STATUS_MESSAGE.DASHBOARD_FETCH_FAILED,
    );
  }

  return res.status(STATUS_CODE.OK).json(userService.sanitize(user));
}
