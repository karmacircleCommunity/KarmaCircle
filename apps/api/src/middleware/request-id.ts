import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";

/**
 * One id per request, so a request can be followed through the logs of every
 * service it touches: the API logs it, the image service and the notification
 * worker log the same one, and the response carries it back to the browser.
 *
 * An id sent in `X-Request-Id` is kept when it is plain (letters, digits, dot,
 * underscore, dash, at most 64), so a caller can follow its own request, and
 * otherwise a new one is made. The value goes into logs and headers, so
 * anything with other characters is not trusted and not echoed.
 */
export const REQUEST_ID_HEADER = "X-Request-Id";
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

const context = new AsyncLocalStorage<{ requestId: string }>();

/** The id of the request being handled, from anywhere below `bindRequestContext`. */
export const getRequestId = (): string | undefined =>
  context.getStore()?.requestId;

export type RequestWithId = Request & { id?: string };

/** Gives the request its id and puts it on the response. Runs first, so the access log has it. */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const id =
    incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  (req as RequestWithId).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

/**
 * Makes the id available to code that has no `req` (the notification queue
 * stamps it on the jobs it writes). Mounted after the body parsers on purpose:
 * `AsyncLocalStorage` can lose its context across the stream events a body
 * parser waits on, depending on the Node version. Here, on Node 22.23, it
 * survives either way (checked), but from this point `next` is called inside
 * the context, so everything below sees it whatever the version does.
 */
export function bindRequestContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const id = (req as RequestWithId).id;
  if (!id) return next();
  context.run({ requestId: id }, next);
}
