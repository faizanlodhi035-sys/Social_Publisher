import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { workspaceService } from "../services/workspaceService.js";
import { getAdminAuth } from "../firebase/admin.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  workspaceId?: string;
  saasRole?: "user" | "saas_admin";
  userStatus?: "active" | "suspended";
}

/**
 * Validates authentication session / Bearer ID token.
 * In production, strictly requires a verified Firebase ID token.
 * In development/test, supports verified tokens with explicit local dev tokens.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionUser = (req as any).session?.userId;
    const customUserHeader = req.headers["x-user-id"] as string;
    const customEmailHeader = req.headers["x-user-email"] as string;

    let userId: string | undefined = sessionUser;
    let userEmail: string | undefined = (req as any).session?.userEmail || customEmailHeader;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]?.trim();
      if (!token) {
        return next(new AppError("Malformed Authorization header. Expected 'Bearer <token>'.", 401, "UNAUTHORIZED"));
      }

      // Try Firebase Admin Token Verification if initialized
      const auth = getAdminAuth();
      if (auth) {
        try {
          const decodedToken = await auth.verifyIdToken(token);
          userId = decodedToken.uid;
          userEmail = decodedToken.email || userEmail;
        } catch (err: any) {
          // Token verification fallback ONLY for non-production environments
          if (
            process.env.NODE_ENV !== "production" &&
            (token.startsWith("dev-user-") || token.startsWith("user_") || token === "dev_default_user")
          ) {
            userId = token;
          } else {
            return next(new AppError("Invalid or expired authentication token.", 401, "INVALID_TOKEN"));
          }
        }
      } else {
        // Firebase Admin not configured (local development or tests)
        if (
          process.env.NODE_ENV !== "production" &&
          (token.startsWith("dev-user-") || token.startsWith("user_") || token === "dev_default_user")
        ) {
          userId = token;
        } else if (process.env.NODE_ENV !== "production") {
          userId = `user_${token.slice(0, 16).replace(/[^a-zA-Z0-9_-]/g, "")}`;
        } else {
          return next(new AppError("Authentication service unavailable.", 503, "AUTH_UNAVAILABLE"));
        }
      }
    }

    // Custom user header for dev/testing when explicit
    if (!userId && customUserHeader && process.env.NODE_ENV !== "production") {
      userId = customUserHeader;
    }

    // If still no authenticated user, strictly reject with 401
    if (!userId) {
      return next(new AppError("Authentication required. Please provide a valid Bearer token.", 401, "UNAUTHORIZED"));
    }

    req.userId = userId;
    req.userEmail = userEmail || `${userId}@socialpublisher.com`;

    // Automatically provision user's personal workspace idempotently & fetch profile
    const { workspace, user } = await workspaceService.getOrCreateUserWorkspace(req.userId, req.userEmail);
    req.workspaceId = workspace.id;
    req.saasRole = user.saasRole || "user";
    req.userStatus = user.status || "active";

    // Enforce account suspension check
    if (req.userStatus === "suspended") {
      return next(new AppError("Account is suspended. Please contact administrator.", 403, "ACCOUNT_SUSPENDED"));
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validates workspace membership and scopes requests to prevent cross-workspace data access.
 * Authoritative: Rejects access with 403 if caller does not belong to the requested workspace.
 */
export const requireWorkspaceAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestedWorkspace =
      (req.headers["x-workspace-id"] as string) ||
      (req.query.workspaceId as string) ||
      req.body?.workspaceId;

    if (!req.userId) {
      return next(new AppError("User is not authenticated.", 401, "UNAUTHORIZED"));
    }

    const personalWsId = workspaceService.getPersonalWorkspaceId(req.userId);

    if (requestedWorkspace) {
      const sanitized = requestedWorkspace.replace(/[^a-zA-Z0-9_-]/g, "");
      const isMember = await workspaceService.isUserMemberOfWorkspace(req.userId, sanitized);

      if (!isMember) {
        return next(new AppError("Access denied to requested workspace.", 403, "WORKSPACE_ACCESS_DENIED"));
      }

      req.workspaceId = sanitized;
    } else if (!req.workspaceId) {
      req.workspaceId = personalWsId;
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Server-side authorization middleware for SaaS Admin endpoints.
 * Never trusts client-supplied roles, parameters, or hidden UI flags.
 */
export const requireSaasAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return next(new AppError("User is not authenticated.", 401, "UNAUTHORIZED"));
    }

    let isSaasAdmin = req.saasRole === "saas_admin";

    // Verify against UserProfile doc directly to be 100% authoritative
    const userProfile = await workspaceService.getUserProfile(req.userId);
    if (userProfile?.saasRole === "saas_admin") {
      isSaasAdmin = true;
    }

    // Dev mode header fallback if explicitly allowed for testing
    if (process.env.NODE_ENV !== "production" && req.headers["x-saas-admin"] === "true") {
      isSaasAdmin = true;
    }

    if (!isSaasAdmin) {
      return next(new AppError("SaaS Admin privileges required.", 403, "SAAS_ADMIN_REQUIRED"));
    }

    next();
  } catch (err) {
    next(err);
  }
};
