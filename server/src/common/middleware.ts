import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { TeamRole } from "./enums.ts";
import { HttpError, badRequest, internalError, unauthorized } from "./errors.ts";
import { TeamMember } from "../models/team-member.model.ts";

declare global {
  namespace Express {
    interface Request {
      user?: TeamMember;
    }
  }
}

export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

export const requireAuth = (allowedRoles?: TeamRole[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.header("x-user-id");
      if (!userId) {
        return next(unauthorized("Missing user id"));
      }

      const user = await TeamMember.findOne({ where: { userId } });
      if (!user) {
        return next(unauthorized("User not found"));
      }

      if (user.role !== TeamRole.Manager && !user.teamId) {
        return next(unauthorized("User missing team assignment"));
      }

      if (allowedRoles && !allowedRoles.includes(user.role as TeamRole)) {
        return next(unauthorized("Forbidden for this role"));
      }

      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };

export const validate = (schema: ZodTypeAny, property: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(badRequest("Validation failed", result.error.flatten()));
    }

    const mutableReq = req as unknown as Record<string, unknown>;
    mutableReq[property] = result.data;
    return next();
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err instanceof HttpError ? err : internalError("Unexpected error", err);
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(error.status).json({
    message: error.message,
    details: error.details ?? undefined
  });
};
