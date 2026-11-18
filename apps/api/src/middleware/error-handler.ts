import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { STATUS_CODE, STATUS_MESSAGE } from "../constants/http-status";
import { logger } from "../config/logger";
import { reportError } from "../config/monitoring";

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(STATUS_CODE.NOT_FOUND).json({ message: STATUS_MESSAGE.NOT_FOUND });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  ) {
    return res
      .status(STATUS_CODE.CONFLICT)
      .json({ message: "A record with these details already exists" });
  }

  logger.error({ err }, "Unhandled error");
  // Only unexpected errors are reported. Expected failures (AppError,
  // validation, duplicates) are normal answers, not incidents. The report is
  // sent before the response so a serverless function is not frozen first.
  await reportError(err, {
    method: req.method,
    route: req.route?.path ?? req.baseUrl,
  });
  return res
    .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
    .json({ message: STATUS_MESSAGE.INTERNAL_SERVER_ERROR });
}
