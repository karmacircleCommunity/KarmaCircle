import { Request, Response } from "express";
import { STATUS_CODE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import * as uploadService from "./upload.service";
import type { CoverUploadRequest } from "./upload.validation";

/** The address the browser used to reach this API, for links it can follow. */
const originOf = (req: Request) => `${req.protocol}://${req.get("host")}`;

export async function requestCoverUpload(
  req: AuthenticatedRequest,
  res: Response,
) {
  const ticket = await uploadService.createCoverUpload(
    req.auth.email,
    req.body as CoverUploadRequest,
    originOf(req),
  );
  res.status(STATUS_CODE.CREATED).json(ticket);
}

/** Development and test only: receives the bytes of a `direct` upload. */
export async function saveLocalUpload(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      "Cover image must be a PNG, JPEG, WebP or GIF image",
    );
  }
  await uploadService.saveLocalUpload(
    req.params.token,
    req.get("content-type")?.split(";")[0].trim().toLowerCase(),
    req.body,
  );
  res.status(STATUS_CODE.OK).json({ message: "Image uploaded" });
}
