import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler<Req extends Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler so a thrown/rejected error reaches the
 * global error handler instead of crashing the process. The type param
 * also lets protected routes declare a narrower request type (see
 * AuthenticatedRequest in middleware/auth.ts) so a handler that assumes
 * req.auth is set can't be typed against a plain Request by accident.
 * The cast below is the one place that trust is asserted; the caller
 * (the route file) is what actually has to prove it by putting the
 * matching middleware (e.g. requireAuth) in front of it.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: AsyncRequestHandler<Req>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
