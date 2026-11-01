import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as userService from "../users/user.service";
import * as organizationService from "./organization.service";
import {
  Organization,
  OrganizationAnalyticsEvent,
  OrganizationFollow,
} from "./organization.model";
import { Event, EventRegistration } from "../events/event.model";
import { ORDER_STATUS, Order } from "../payments/order.model";
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
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hostedEventFilter = {
    $or: [
      { organizerHandle: organization.handle },
      { organizerHandle: { $exists: false }, hostUsername: organization.handle },
    ],
  };
  const [events, eventCount, allEventUids, demoEventCount] = await Promise.all([
    Event.find(hostedEventFilter).sort({ startTime: -1 }).limit(8).lean(),
    Event.countDocuments(hostedEventFilter),
    Event.distinct("uid", hostedEventFilter),
    Event.countDocuments({ ...hostedEventFilter, isDemo: true }),
  ]);
  const [
    followerCount,
    followingCount,
    paidOrders,
    views7,
    views30,
    viewsByDay,
    registrations,
    followers,
    supporterCount,
    verifiedSupporterCount,
    raisedPaise,
    demoFollowerCount,
    demoSupportTotals,
    demoViewCount,
  ] = await Promise.all([
    OrganizationFollow.countDocuments({ organizationHandle: organization.handle }),
    OrganizationFollow.countDocuments({ followerEmail: email }),
    Order.find({ organizationHandle: organization.handle, status: ORDER_STATUS.Paid })
      .sort({ createdAt: -1 })
      .limit(8)
      .select({ amountPaise: 1, currency: 1, supporterName: 1, createdAt: 1, isDemo: 1 })
      .lean(),
    OrganizationAnalyticsEvent.countDocuments({
      organizationHandle: organization.handle,
      occurredAt: { $gte: sevenDaysAgo },
    }),
    OrganizationAnalyticsEvent.countDocuments({
      organizationHandle: organization.handle,
      occurredAt: { $gte: thirtyDaysAgo },
    }),
    OrganizationAnalyticsEvent.aggregate([
      {
        $match: {
          organizationHandle: organization.handle,
          occurredAt: { $gte: new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
          views: { $sum: 1 },
          demoViews: { $sum: { $cond: [{ $eq: ["$isDemo", true] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    allEventUids.length
      ? EventRegistration.aggregate([
          { $match: { eventUid: { $in: allEventUids } } },
          { $group: { _id: "$eventUid", registrations: { $sum: 1 } } },
        ])
      : [],
    OrganizationFollow.find({ organizationHandle: organization.handle })
      .sort({ createdAt: -1 })
      .limit(8)
      .select({ followerEmail: 1, createdAt: 1, isDemo: 1 })
      .lean(),
    Order.countDocuments({ organizationHandle: organization.handle, status: ORDER_STATUS.Paid }),
    Order.countDocuments({
      organizationHandle: organization.handle,
      status: ORDER_STATUS.Paid,
      isDemo: { $ne: true },
    }),
    Order.aggregate([
      {
        $match: {
          organizationHandle: organization.handle,
          status: ORDER_STATUS.Paid,
          isDemo: { $ne: true },
        },
      },
      { $group: { _id: null, total: { $sum: "$amountPaise" } } },
    ]),
    OrganizationFollow.countDocuments({ organizationHandle: organization.handle, isDemo: true }),
    Order.aggregate([
      { $match: { organizationHandle: organization.handle, status: ORDER_STATUS.Paid, isDemo: true } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amountPaise" } } },
    ]),
    OrganizationAnalyticsEvent.countDocuments({ organizationHandle: organization.handle, isDemo: true }),
  ]);
  const followerProfiles = await Promise.all(
    followers.map(async (follow) => {
      const follower = await userService.findByEmail(follow.followerEmail);
      return {
        name: follower?.name || "KarmaCircle member",
        userName: follower?.userName,
        followedAt: follow.createdAt,
        isDemo: follow.isDemo ?? false,
      };
    }),
  );
  const registrationCounts = new Map(
    registrations.map((entry: { _id: string; registrations: number }) => [entry._id, entry.registrations]),
  );

  return res.status(STATUS_CODE.OK).json({
    organization: organizationService.toPrivate(organization),
    profile: userService.sanitize(user),
    includesDemoData:
      demoEventCount + demoFollowerCount + (demoSupportTotals[0]?.count ?? 0) + demoViewCount > 0,
    period: { days: 30 },
    metrics: {
      followers: followerCount,
      following: followingCount,
      hostedEvents: eventCount,
      supporters: supporterCount,
      verifiedSupporters: verifiedSupporterCount,
      raisedViaPlatform: Math.floor((raisedPaise[0]?.total ?? 0) / 100),
      demoSupporters: demoSupportTotals[0]?.count ?? 0,
      demoRaisedViaPlatform: Math.floor((demoSupportTotals[0]?.total ?? 0) / 100),
      profileViews: { last7Days: views7, last30Days: views30 },
      eventRegistrations: registrations.reduce((sum: number, entry: { registrations: number }) => sum + entry.registrations, 0),
    },
    viewsByDay,
    events: events.map((event) => ({
      uid: event.uid,
      name: event.name,
      description: event.description,
      startTime: event.startTime,
      mode: event.mode,
      city: event.city,
      coverImage: event.coverImage,
      registrations: registrationCounts.get(event.uid) ?? 0,
      isDemo: event.isDemo ?? false,
    })),
    supporters: paidOrders.map((order) => ({
      name: order.supporterName?.trim() || "Anonymous supporter",
      amount: Math.floor(order.amountPaise / 100),
      currency: order.currency,
      supportedAt: order.createdAt,
      isDemo: order.isDemo ?? false,
    })),
    followers: followerProfiles,
  });
}

export async function trackProfileView(req: Request, res: Response) {
  const handle = String(req.params.handle);
  const organization = await organizationService.findLiveByHandle(handle);
  if (!organization) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.ORGANIZATION_NOT_FOUND);
  }
  await OrganizationAnalyticsEvent.create({
    organizationHandle: handle,
    eventType: "profile_view",
    occurredAt: new Date(),
  });
  return res.status(STATUS_CODE.NO_CONTENT).end();
}

export async function getFollowStatus(req: AuthenticatedRequest, res: Response) {
  const handle = String(req.params.handle);
  const isFollowing = await OrganizationFollow.exists({
    organizationHandle: handle,
    followerEmail: req.auth.email,
  });
  return res.status(STATUS_CODE.OK).json({ following: Boolean(isFollowing) });
}

export async function followOrganization(req: AuthenticatedRequest, res: Response) {
  const handle = String(req.params.handle);
  const organization = await organizationService.findLiveByHandle(handle);
  if (!organization) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.ORGANIZATION_NOT_FOUND);
  }
  if (organization.ownerEmail === req.auth.email) {
    throw new AppError(STATUS_CODE.BAD_REQUEST, "You cannot follow your own organization.");
  }
  try {
    await OrganizationFollow.create({ organizationHandle: handle, followerEmail: req.auth.email });
    await Organization.updateOne({ _id: organization._id }, { $inc: { followers: 1 } });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  return res.status(STATUS_CODE.OK).json({ following: true });
}

export async function unfollowOrganization(req: AuthenticatedRequest, res: Response) {
  const handle = String(req.params.handle);
  const deleted = await OrganizationFollow.findOneAndDelete({
    organizationHandle: handle,
    followerEmail: req.auth.email,
  });
  if (deleted) {
    await Organization.updateOne(
      { handle, followers: { $gt: 0 } },
      { $inc: { followers: -1 } },
    );
  }
  return res.status(STATUS_CODE.OK).json({ following: false });
}
