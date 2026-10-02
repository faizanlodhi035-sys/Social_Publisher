import type { Response, NextFunction } from "express";
import { backendPublishService } from "../services/publishService.js";
import type { PublishRequestPayload } from "../types/index.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const publishPost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as PublishRequestPayload;
    const workspaceId = req.workspaceId || "default-workspace";
    const result = await backendPublishService.publish(payload, workspaceId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
