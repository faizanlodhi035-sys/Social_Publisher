import type { Response, NextFunction } from "express";
import { mediaStorageService } from "../services/mediaStorageService.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { AppError } from "../utils/errors.js";

export const getMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const media = await mediaStorageService.getAllMedia(workspaceId);
    res.json(media);
  } catch (err) {
    next(err);
  }
};

export const uploadMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const ownerId = req.userId || "system_user";
    const file = req.file;

    if (!file) {
      // Fallback to JSON payload if client sent metadata directly
      const metadata = {
        ...req.body,
        workspaceId,
        ownerId,
      };
      const saved = await mediaStorageService.saveMediaMetadata(metadata, workspaceId);
      return res.json({ success: true, data: saved });
    }

    const saved = await mediaStorageService.uploadBufferToStorage(
      file.buffer,
      file.originalname,
      file.mimetype,
      workspaceId
    );

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";

    // Verify media asset exists and belongs to this workspace
    const existing = await mediaStorageService.getMediaById(id, workspaceId);
    if (!existing) {
      throw new AppError(`Media asset '${id}' not found in the active workspace.`, 404, "MEDIA_NOT_FOUND");
    }

    await mediaStorageService.deleteMedia(id, workspaceId);
    res.json({ success: true, message: "Media asset deleted successfully." });
  } catch (err) {
    next(err);
  }
};
