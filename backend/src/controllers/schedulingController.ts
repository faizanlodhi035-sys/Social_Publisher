import type { Request, Response, NextFunction } from "express";
import { schedulingService } from "../jobs/schedulingService.js";
import { jobRepository } from "../jobs/jobRepository.js";
import { processPublishingJob } from "../jobs/publisherWorker.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { envConfig } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { timingSafeMatch } from "../utils/crypto.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const schedulePost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log("SCHEDULE POST REQUEST BODY:", JSON.stringify(req.body, null, 2));
    const workspaceId = req.workspaceId || "default-workspace";
    const userId = req.userId || "system_user";
    const result = await schedulingService.schedulePost(req.body, userId, workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const publishPostNow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
    const workspaceId = req.workspaceId || "default-workspace";
    const result = await schedulingService.publishPostNow(postId, workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const reschedulePost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
    const workspaceId = req.workspaceId || "default-workspace";
    const { date, time } = req.body;
    if (!date || !time) {
      throw new AppError("Date and time are required for rescheduling.", 400, "INVALID_REQUEST");
    }

    const result = await schedulingService.reschedulePost(postId, date, time, workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const cancelScheduledPost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
    const workspaceId = req.workspaceId || "default-workspace";
    const result = await schedulingService.cancelScheduledPost(postId, workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getScheduledPosts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const posts = await schedulingService.listScheduledPosts(workspaceId);
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const workspaceId = req.workspaceId || "default-workspace";

    const job = await jobRepository.getJobById(jobId, workspaceId);
    if (!job || (job.workspaceId && job.workspaceId !== workspaceId)) {
      throw new AppError(`Job '${jobId}' not found in the active workspace.`, 404, "JOB_NOT_FOUND");
    }

    const auditEvents = await auditRepository.getPostAuditEvents(job.postId, workspaceId);
    res.json({ success: true, data: { job, auditEvents } });
  } catch (err) {
    next(err);
  }
};

export const retryJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const workspaceId = req.workspaceId || "default-workspace";

    // Verify job belongs to caller's workspace before allowing retry
    const job = await jobRepository.getJobById(jobId, workspaceId);
    if (!job || (job.workspaceId && job.workspaceId !== workspaceId)) {
      throw new AppError(`Job '${jobId}' not found in the active workspace.`, 404, "JOB_NOT_FOUND");
    }

    const result = await processPublishingJob(jobId, workspaceId);
    res.json({ success: result.success, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Internal worker invocation endpoint for background job processing.
 * Strictly protected: Requires trusted Cloud Tasks headers or matching worker secret.
 * Authoritative: Uses the verified job's workspaceId directly from storage.
 */
export const processInternalJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workerToken = (req.headers["x-worker-token"] as string) || "";
    const authHeader = req.headers["authorization"] || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    const expectedWorkerSecret = process.env.WORKER_SECRET || envConfig.SESSION_SECRET;

    // Validate token using timing-safe comparison
    const hasValidWorkerToken =
      timingSafeMatch(workerToken, expectedWorkerSecret) ||
      timingSafeMatch(bearerToken, expectedWorkerSecret);

    // If Cloud Tasks OIDC token or queue header is present in GCP production
    const isCloudTasksHeader = Boolean(req.headers["x-cloudtasks-queuename"]);

    if (!hasValidWorkerToken && !isCloudTasksHeader) {
      throw new AppError("Unauthorized worker invocation. Invalid worker credentials.", 401, "UNAUTHORIZED");
    }

    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;

    // Look up job across workspaces to determine authoritative workspaceId
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new AppError(`Publishing job '${jobId}' does not exist.`, 404, "JOB_NOT_FOUND");
    }

    const authoritativeWorkspaceId = job.workspaceId || "default-workspace";

    const result = await processPublishingJob(jobId, authoritativeWorkspaceId);
    res.json({ success: result.success, data: result });
  } catch (err) {
    next(err);
  }
};
