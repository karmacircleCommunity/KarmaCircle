import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result: unknown = schema.parse(req[part]);
    req[part] = result as never;
    next();
  };
}
