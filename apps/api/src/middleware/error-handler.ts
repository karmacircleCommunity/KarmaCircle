import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { STATUS_CODE, STATUS_MESSAGE } from "../constants/http-status";
import { logger } from "../config/logger";

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
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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

  // Errors raised by the body parsers (a payload over the limit, malformed JSON)
  // carry their own 4xx status. Answer with it instead of a 500.
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    const { status, type } = err as { status: number; type?: string };
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message:
          status === 413
            ? "That upload is too large."
            : type === "entity.parse.failed"
              ? "The request body is not valid JSON."
              : "The request could not be read.",
      });
    }
  }

  logger.error({ err }, "Unhandled error");
  return res
    .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
    .json({ message: STATUS_MESSAGE.INTERNAL_SERVER_ERROR });
}
