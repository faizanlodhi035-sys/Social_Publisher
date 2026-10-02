import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { aiService } from "../services/ai/aiService.js";

export const generateCaption = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.generateCaption(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const rewriteCaption = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.rewriteCaption(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const generateIdeas = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.generateIdeas(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const generateHashtags = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.generateHashtags(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const adaptContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.adaptContent(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const generateHooks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await aiService.generateHooks(
      req.body,
      req.userId || "system_user",
      req.workspaceId || "default-workspace"
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAIStatus = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json({
      success: true,
      data: {
        provider: aiService.getProvider().name,
        model: aiService.getConfiguredModel(),
        supportedPlatforms: ["Instagram", "Facebook", "TikTok", "YouTube"],
        supportedOperations: ["caption", "rewrite", "ideas", "hashtags", "adapt"],
        languages: ["English", "Urdu", "Roman Urdu"],
      },
    });
  } catch (err) {
    next(err);
  }
};
