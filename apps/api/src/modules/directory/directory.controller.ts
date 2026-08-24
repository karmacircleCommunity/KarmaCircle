import { Request, Response } from "express";
import { STATUS_CODE } from "../../constants/http-status";
import {
  PaginationQuery,
  buildPaginationMeta,
  toSkipLimit,
} from "../../utils/pagination";
import * as userService from "../users/user.service";

export async function listAllUsers(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as PaginationQuery;
  const { data, total } = await userService.findAll(
    toSkipLimit({ page, limit }),
  );
  res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
}

export async function listOrganizations(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as PaginationQuery;
  const { data, total } = await userService.findByType(
    "organization",
    toSkipLimit({ page, limit }),
  );
  res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
}
