import { jobRepository } from "./jobRepository.js";
import { postRepository } from "../repositories/postRepository.js";
import { accountRepository } from "../repositories/accountRepository.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { backendPublishService } from "../services/publishService.js";
import { calculateNextAttempt, classifyError } from "./retryPolicy.js";
import { publishingQueue } from "./queueAdapter.js";
import type { PublishingJob } from "./types.js";

export async function processPublishingJob(
  jobId: string,
  workspaceId = "default-workspace"
): Promise<{ success: boolean; job?: PublishingJob; error?: string }> {
  // 1. Claim job atomically
  const job = await jobRepository.claimJob(jobId, workspaceId);
  if (!job) {
    // Already processing, completed, or non-existent
    const existing = await jobRepository.getJobById(jobId, workspaceId);
    if (existing?.status === "published") {
      return { success: true, job: existing };
    }
    return { success: false, error: "Job already claimed, completed, or not found." };
  }

  await auditRepository.logEvent({
    workspaceId,
    postId: job.postId,
    jobId: job.id,
    accountId: job.accountId,
    platform: job.platform,
    eventType: "processing",
    message: `Worker claimed job for ${job.platform} publishing.`,
  });

  try {
    // 2. Load associated Post
    const post = await postRepository.getPostById(job.postId, workspaceId);
    if (!post) {
      throw new Error(`Post with ID '${job.postId}' was not found.`);
    }

    // 3. Find matching account for platform
    let account = await accountRepository.getAccountById(job.accountId, workspaceId);
    if (!account) {
      // Fallback: search for any connected account matching platform
      const accounts = await accountRepository.getAllAccounts(workspaceId);
      account = accounts.find((a) => a.platform === job.platform && a.status === "connected") || null;
    }

    if (!account) {
      throw new Error(`No connected ${job.platform} account found for publishing.`);
    }

    // 4. Invoke Publishing Service (Phase 5 Provider API Abstraction)
    const result = await backendPublishService.publish({
      accountId: account.id,
      caption: job.caption || post.caption,
      mediaUrls: job.mediaUrls.length > 0 ? job.mediaUrls : post.mediaUrls,
    });

    if (!result.success) {
      throw new Error(result.error || `Publishing to ${job.platform} failed.`);
    }

    // 5. Mark Job Published Successfully
    const publishedAt = result.publishedAt || new Date().toISOString();
    const updatedJob = await jobRepository.updateJob(
      job.id,
      {
        status: "published",
        completedAt: publishedAt,
        providerPostId: result.postId,
        lastError: undefined,
      },
      workspaceId
    );

    // Update Post status
    await postRepository.createPost(
      {
        id: post.id,
        status: "Published",
      },
      workspaceId
    );

    await auditRepository.logEvent({
      workspaceId,
      postId: job.postId,
      jobId: job.id,
      accountId: account.id,
      platform: job.platform,
      eventType: "published",
      message: `Successfully published to ${job.platform} (Provider ID: ${result.postId}).`,
      details: { providerPostId: result.postId },
    });

    return { success: true, job: updatedJob || undefined };
  } catch (err) {
    const errorDetails = classifyError(err);
    const nextAttempts = job.attempts + 1;

    if (errorDetails.isRetryable && nextAttempts < job.maxAttempts) {
      // Retryable error -> Schedule retry attempt
      const nextAttemptMs = calculateNextAttempt(nextAttempts, errorDetails.category);
      const nextAttemptIso = new Date(nextAttemptMs).toISOString();

      const retryingJob = await jobRepository.updateJob(
        job.id,
        {
          status: "retrying",
          attempts: nextAttempts,
          nextAttemptAt: nextAttemptIso,
          lastError: errorDetails.message,
          errorCategory: errorDetails.category,
        },
        workspaceId
      );

      await auditRepository.logEvent({
        workspaceId,
        postId: job.postId,
        jobId: job.id,
        accountId: job.accountId,
        platform: job.platform,
        eventType: "retrying",
        message: `Publish attempt ${nextAttempts} failed (${errorDetails.category}). Retrying at ${nextAttemptIso}`,
        details: { attempt: nextAttempts, nextAttemptAt: nextAttemptIso, error: errorDetails.message },
      });

      // Enqueue retry
      if (retryingJob) {
        await publishingQueue.scheduleTask(retryingJob, nextAttemptMs);
      }

      return { success: false, job: retryingJob || undefined, error: errorDetails.message };
    }

    // Non-retryable error or Max Attempts Reached -> Mark Failed
    const failedJob = await jobRepository.updateJob(
      job.id,
      {
        status: "failed",
        attempts: nextAttempts,
        failedAt: new Date().toISOString(),
        lastError: errorDetails.message,
        errorCategory: errorDetails.category,
      },
      workspaceId
    );

    await postRepository.createPost(
      {
        id: job.postId,
        status: "Failed",
      },
      workspaceId
    );

    await auditRepository.logEvent({
      workspaceId,
      postId: job.postId,
      jobId: job.id,
      accountId: job.accountId,
      platform: job.platform,
      eventType: "failed",
      message: `Publishing to ${job.platform} permanently failed: ${errorDetails.message}`,
      details: { attempts: nextAttempts, error: errorDetails.message },
    });

    return { success: false, job: failedJob || undefined, error: errorDetails.message };
  }
}
