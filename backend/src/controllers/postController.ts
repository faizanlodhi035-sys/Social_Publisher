import type { Response, NextFunction } from "express";
import { postRepository } from "../repositories/postRepository.js";
import { jobRepository } from "../jobs/jobRepository.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { AppError } from "../utils/errors.js";

export const getPosts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const posts = await postRepository.getAllPosts(workspaceId);
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

export const getPostById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";
    const post = await postRepository.getPostById(id, workspaceId);
    if (!post) {
      throw new AppError(`Post '${id}' not found in the active workspace.`, 404, "POST_NOT_FOUND");
    }
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

export const createPost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const authorId = req.userId || "system_user";

    // Enforce workspaceId and authorId server-side to prevent tampering
    const postData = {
      ...req.body,
      workspaceId,
      authorId,
    };

    const created = await postRepository.createPost(postData, workspaceId);
    res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const deletePost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";

    // Verify post exists and belongs to workspace before deletion
    const existing = await postRepository.getPostById(id, workspaceId);
    if (!existing) {
      throw new AppError(`Post '${id}' not found in the active workspace.`, 404, "POST_NOT_FOUND");
    }

    await postRepository.deletePost(id, workspaceId);

    // Also delete any associated background publishing jobs so they don't recreate the post
    const jobs = await jobRepository.getJobsByPostId(id, workspaceId);
    for (const job of jobs) {
      await jobRepository.deleteJob(job.id, workspaceId);
    }

    res.json({ success: true, message: "Post and associated jobs deleted successfully." });
  } catch (err) {
    next(err);
  }
};
