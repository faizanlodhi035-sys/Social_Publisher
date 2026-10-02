import type { Request, Response, NextFunction } from "express";
import { envConfig } from "../config/env.js";
import { oauthService } from "../services/oauthService.js";
import type { SocialPlatform } from "../types/index.js";
import { AppError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const getAuthStatus = (req: Request, res: Response) => {
  const status = oauthService.getAuthStatus();
  res.json({ success: true, data: status });
};

export const initiateOAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawPlatform = (req.params.platform || req.query.platform) as string;
    if (!rawPlatform) {
      throw new AppError("Platform parameter is required", 400, "INVALID_REQUEST");
    }

    const platform = normalizePlatform(rawPlatform);
    const workspaceId = req.workspaceId || (req.query.workspaceId as string) || "default-workspace";
    const { url, stateToken } = oauthService.initiateOAuth(platform, workspaceId);

    // Save stateToken in HTTP-Only signed cookie for CSRF protection
    res.cookie(`oauth_state_${platform.toLowerCase()}`, stateToken, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.redirect(url);
  } catch (err) {
    next(err);
  }
};

export const handleOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const rawPlatform = req.params.platform as string;
  const code = req.query.code as string;
  const state = req.query.state as string;
  const errorQuery = req.query.error as string;
  const errorDescription = req.query.error_description as string;

  const platform = normalizePlatform(rawPlatform);

  if (errorQuery || errorDescription) {
    const errMsg = errorDescription || errorQuery || "Authorization was denied by user.";
    return res.redirect(`${envConfig.FRONTEND_URL}/accounts?oauth=error&platform=${platform}&message=${encodeURIComponent(errMsg)}`);
  }

  if (!code || !state) {
    return res.redirect(`${envConfig.FRONTEND_URL}/accounts?oauth=error&platform=${platform}&message=${encodeURIComponent("Missing authorization code or state token.")}`);
  }

  try {
    await oauthService.handleCallback(platform, code, state);
    res.clearCookie(`oauth_state_${platform.toLowerCase()}`);
    res.redirect(`${envConfig.FRONTEND_URL}/accounts?oauth=success&platform=${platform}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed.";
    res.redirect(`${envConfig.FRONTEND_URL}/accounts?oauth=error&platform=${platform}&message=${encodeURIComponent(message)}`);
  }
};

function normalizePlatform(p: string): SocialPlatform {
  const lower = p.toLowerCase();
  if (lower === "facebook") return "Facebook";
  if (lower === "instagram") return "Instagram";
  if (lower === "tiktok") return "TikTok";
  if (lower === "youtube") return "YouTube";
  throw new AppError(`Unsupported platform '${p}'`, 400, "INVALID_PLATFORM");
}
