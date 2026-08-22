import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as userService from "../users/user.service";
import { ListClubsQuery } from "./club.validation";

export async function listClubs(req: Request, res: Response) {
  const { userName, page, limit } = req.query as unknown as ListClubsQuery;

  if (userName) {
    const club = await userService.findByUsername(userName);

    if (!club) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res.status(STATUS_CODE.OK).json(club);
  }

  const { data, total } = await userService.findByType(
    "club",
    toSkipLimit({ page, limit }),
  );
  return res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
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
