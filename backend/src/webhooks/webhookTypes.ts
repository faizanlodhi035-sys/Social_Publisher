import type { SocialPlatform } from "../types/index.js";

export type ProcessingStatus = "received" | "processing" | "processed" | "failed" | "ignored";

export interface NormalizedSocialEvent {
  id: string;
  provider: SocialPlatform;
  eventType: string;
  accountId: string;
  externalEventId: string;
  postId?: string;
  receivedAt: number;
  processedAt: number;
  payloadVersion: string;
  processingStatus: ProcessingStatus;
  normalizedData: {
    action: string;
    mediaId?: string;
    authorName?: string;
    text?: string;
    metrics?: Record<string, number>;
    rawType?: string;
  };
}

export interface WebhookEventRecord {
  id: string; // provider_externalEventId
  provider: SocialPlatform;
  externalEventId: string;
  status: ProcessingStatus;
  createdAt: number;
  processedAt?: number;
  error?: string;
}
