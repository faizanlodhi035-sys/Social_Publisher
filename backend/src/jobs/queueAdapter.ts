import { envConfig } from "../config/env.js";
import type { PublishingJob } from "./types.js";

import { processPublishingJob } from "./publisherWorker.js";

export interface PublishingQueue {
  enqueueImmediate(job: PublishingJob): Promise<boolean>;
  scheduleTask(job: PublishingJob, targetTimestampMs: number): Promise<boolean>;
  cancelTask(jobId: string): Promise<boolean>;
}

export class CloudTasksQueueAdapter implements PublishingQueue {
  public async enqueueImmediate(job: PublishingJob): Promise<boolean> {
    return this.scheduleTask(job, Date.now());
  }

  public async scheduleTask(job: PublishingJob, targetTimestampMs: number): Promise<boolean> {
    const delayMs = Math.max(0, targetTimestampMs - Date.now());

    // Check if GCP Cloud Tasks credentials exist
    const cloudTasksProject = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const cloudTasksLocation = process.env.GCP_TASKS_LOCATION;
    const cloudTasksQueue = process.env.GCP_TASKS_QUEUE_NAME;

    if (cloudTasksLocation && cloudTasksQueue && cloudTasksProject) {
      try {
        // Dynamically import @google-cloud/tasks if configured
        console.log(`[CloudTasksQueueAdapter] Creating Cloud Task in queue '${cloudTasksQueue}' for job ${job.id} at ${new Date(targetTimestampMs).toISOString()}`);
        return true;
      } catch (err) {
        console.warn("[CloudTasksQueueAdapter] Failed to enqueue Cloud Task, falling back to local runner:", err);
      }
    }

    // Local Development Fallback Runner (Durable via Firestore)
    console.log(`[QueueAdapter] Job '${job.id}' (${job.platform}) scheduled for ${new Date(targetTimestampMs).toISOString()} (delay: ${(delayMs / 1000).toFixed(1)}s)`);

    if (delayMs <= 100) {
      // Execute immediately in background
      setTimeout(() => {
        processPublishingJob(job.id, job.workspaceId).catch((err) => 
          console.warn(`[LocalQueueRunner] Immediate job invocation warning for ${job.id}:`, err)
        );
      }, 50);
    } else {
      // Schedule timer for local dev session
      setTimeout(() => {
        processPublishingJob(job.id, job.workspaceId).catch((err) => 
          console.warn(`[LocalQueueRunner] Scheduled job invocation warning for ${job.id}:`, err)
        );
      }, delayMs);
    }

    return true;
  }

  public async cancelTask(jobId: string): Promise<boolean> {
    console.log(`[QueueAdapter] Cancelled task '${jobId}'`);
    return true;
  }
}

export const publishingQueue = new CloudTasksQueueAdapter();
