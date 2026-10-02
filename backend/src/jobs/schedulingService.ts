import { postRepository, type PostRecord } from "../repositories/postRepository.js";
import { jobRepository } from "./jobRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { publishingQueue } from "./queueAdapter.js";
import type { PublishingJob, SchedulePostRequest } from "./types.js";
import type { SocialPlatform } from "../types/index.js";

export class SchedulingService {
  /**
   * Schedules a post across one or multiple target platforms.
   * Creates independent publishing jobs for each platform.
   */
  public async schedulePost(
    request: SchedulePostRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<{ post: PostRecord; jobs: PublishingJob[] }> {
    const isImmediate = Boolean(request.publishNow || (!request.scheduleDate && !request.scheduleTime));

    let scheduledTimestampMs = Date.now();
    let dateStr = new Date().toISOString().split("T")[0];
    let timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!isImmediate && request.scheduleDate && request.scheduleTime) {
      dateStr = request.scheduleDate;
      timeStr = request.scheduleTime;
      const targetDate = new Date(`${dateStr}T${timeStr}`);
      if (!Number.isNaN(targetDate.getTime()) && targetDate.getTime() > Date.now()) {
        scheduledTimestampMs = targetDate.getTime();
      }
    }

    const initialPostStatus = isImmediate ? "Publishing" : "Scheduled";

    // 1. Create or Update Post Record in Firestore
    const post = await postRepository.createPost(
      {
        id: request.postId,
        authorId: userId,
        caption: request.caption,
        platforms: request.platforms,
        status: initialPostStatus,
        date: dateStr,
        time: timeStr,
        mediaUrls: request.mediaUrls || [],
      },
      workspaceId
    );

    const createdJobs: PublishingJob[] = [];

    // 2. Create independent publishing jobs per platform
    for (const platform of request.platforms) {
      const accountId = request.accountIds?.[platform] || `${platform.toLowerCase()}-default`;
      const idempotencyKey = `${workspaceId}_${post.id}_${platform.toLowerCase()}`;

      // Check if job already exists for this post & platform (Idempotency)
      let job = await jobRepository.getJobByIdempotencyKey(idempotencyKey, workspaceId);

      if (!job) {
        job = await jobRepository.createJob(
          {
            workspaceId,
            userId,
            postId: post.id,
            accountId,
            platform,
            caption: request.caption,
            mediaUrls: request.mediaUrls || [],
            status: isImmediate ? "queued" : "scheduled",
            scheduledAt: new Date(scheduledTimestampMs).toISOString(),
            idempotencyKey,
          },
          workspaceId
        );
      }

      createdJobs.push(job);

      // 3. Enqueue via Queue Adapter (Cloud Tasks or local adapter)
      if (isImmediate) {
        await publishingQueue.enqueueImmediate(job);
      } else {
        await publishingQueue.scheduleTask(job, scheduledTimestampMs);
      }

      await auditRepository.logEvent({
        workspaceId,
        postId: post.id,
        jobId: job.id,
        accountId,
        platform,
        eventType: isImmediate ? "queued" : "scheduled",
        message: isImmediate
          ? `Post queued for immediate publishing to ${platform}.`
          : `Post scheduled for ${platform} at ${new Date(scheduledTimestampMs).toLocaleString()}.`,
        details: { scheduledAt: new Date(scheduledTimestampMs).toISOString() },
      });
    }

    return { post, jobs: createdJobs };
  }

  /**
   * Reschedules an existing post to a new date and time.
   */
  public async reschedulePost(
    postId: string,
    newDate: string,
    newTime: string,
    workspaceId = "default-workspace"
  ): Promise<{ post: PostRecord; jobs: PublishingJob[] }> {
    const post = await postRepository.getPostById(postId, workspaceId);
    if (!post) {
      throw new Error(`Post '${postId}' not found.`);
    }

    const targetDate = new Date(`${newDate}T${newTime}`);
    if (Number.isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
      throw new Error("Reschedule time must be in the future.");
    }

    const updatedPost = await postRepository.createPost(
      {
        id: post.id,
        date: newDate,
        time: newTime,
        status: "Scheduled",
      },
      workspaceId
    );

    const jobs = await jobRepository.getJobsByPostId(postId, workspaceId);
    const updatedJobs: PublishingJob[] = [];

    for (const job of jobs) {
      if (job.status === "scheduled" || job.status === "retrying" || job.status === "failed") {
        const nextJob = await jobRepository.updateJob(
          job.id,
          {
            status: "scheduled",
            scheduledAt: targetDate.toISOString(),
            attempts: 0,
            lastError: undefined,
          },
          workspaceId
        );
        if (nextJob) {
          updatedJobs.push(nextJob);
          await publishingQueue.scheduleTask(nextJob, targetDate.getTime());
        }
      }
    }

    await auditRepository.logEvent({
      workspaceId,
      postId,
      eventType: "rescheduled",
      message: `Post rescheduled to ${newDate} ${newTime}.`,
    });

    return { post: updatedPost, jobs: updatedJobs };
  }

  /**
   * Cancels a scheduled post and all its pending jobs.
   */
  public async cancelScheduledPost(
    postId: string,
    workspaceId = "default-workspace"
  ): Promise<{ success: boolean; post: PostRecord }> {
    const post = await postRepository.getPostById(postId, workspaceId);
    if (!post) {
      throw new Error(`Post '${postId}' not found.`);
    }

    const updatedPost = await postRepository.createPost(
      {
        id: post.id,
        status: "Cancelled" as any,
      },
      workspaceId
    );

    const jobs = await jobRepository.getJobsByPostId(postId, workspaceId);
    for (const job of jobs) {
      if (job.status === "scheduled" || job.status === "queued" || job.status === "retrying") {
        await jobRepository.updateJob(job.id, { status: "cancelled" }, workspaceId);
        await publishingQueue.cancelTask(job.id);
      }
    }

    await auditRepository.logEvent({
      workspaceId,
      postId,
      eventType: "cancelled",
      message: "Scheduled post was cancelled by user.",
    });

    return { success: true, post: updatedPost };
  }

  /**
   * Immediately triggers publishing for a post.
   */
  public async publishPostNow(postId: string, workspaceId = "default-workspace"): Promise<{ post: PostRecord; jobs: PublishingJob[] }> {
    const post = await postRepository.getPostById(postId, workspaceId);
    if (!post) {
      throw new Error(`Post '${postId}' not found.`);
    }

    return this.schedulePost(
      {
        postId: post.id,
        caption: post.caption,
        platforms: post.platforms as SocialPlatform[],
        mediaUrls: post.mediaUrls,
        publishNow: true,
      },
      post.authorId || "system_user",
      workspaceId
    );
  }

  /**
   * Returns list of scheduled posts for calendar & content manager views.
   */
  public async listScheduledPosts(workspaceId = "default-workspace"): Promise<PostRecord[]> {
    const allPosts = await postRepository.getAllPosts(workspaceId);
    return allPosts.filter((p) => p.status === "Scheduled" || p.status === "Publishing" || (p.status as string) === "Cancelled");
  }
}

export const schedulingService = new SchedulingService();
