import type { SocialPlatform } from "../types/index.js";

export type JobStatus =
  | "queued"
  | "scheduled"
  | "processing"
  | "published"
  | "retrying"
  | "failed"
  | "cancelled";

export type ErrorCategory =
  | "transient"
  | "rate_limited"
  | "authentication"
  | "authorization"
  | "validation"
  | "media"
  | "provider"
  | "unknown";

export interface PublishingJob {
  id: string;
  workspaceId: string;
  userId: string;
  postId: string;
  accountId: string;
  platform: SocialPlatform;
  caption: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  status: JobStatus;
  scheduledAt: string; // ISO date string
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lockedAt?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  lastError?: string;
  lastErrorCode?: string;
  errorCategory?: ErrorCategory;
  providerPostId?: string;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulePostRequest {
  postId?: string;
  caption: string;
  platforms: SocialPlatform[];
  accountIds?: Record<string, string>; // platform -> accountId
  mediaUrls?: string[];
  thumbnailUrl?: string;
  scheduleDate?: string; // YYYY-MM-DD
  scheduleTime?: string; // HH:MM
  publishNow?: boolean;
}
