import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import * as reportService from "./report.service";
import { CreateReportInput } from "./report.validation";

export async function createReport(req: Request, res: Response) {
  const data = req.body as CreateReportInput;

  const alreadyReported = await reportService.hasReportedRecently(data.email);
  if (alreadyReported) {
    return res.status(STATUS_CODE.TOO_MANY_REQUESTS).json({
      success: false,
      message: STATUS_MESSAGE.TOO_MANY_REQUESTS,
    });
  }

  await reportService.createReport(data);
  return res.status(STATUS_CODE.OK).json({ success: true });
}
