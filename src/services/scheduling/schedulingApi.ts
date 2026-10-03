import type { Platform } from "../../types/post";
import { authenticatedFetch } from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface SchedulePostPayload {
  postId?: string;
  caption: string;
  platforms: Platform[];
  scheduleDate?: string;
  scheduleTime?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  publishNow?: boolean;
  accountIds?: Record<string, string>;
}

export interface ScheduledPostItem {
  id: string;
  workspaceId: string;
  title: string;
  caption: string;
  platforms: Platform[];
  status: "Draft" | "Scheduled" | "Published" | "Failed" | "Publishing" | "Cancelled";
  date: string;
  time?: string;
  mediaType?: "Image" | "Video";
  mediaUrls?: string[];
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export interface JobAuditDetail {
  job: {
    id: string;
    workspaceId: string;
    postId: string;
    accountId: string;
    platform: Platform;
    status: "queued" | "scheduled" | "processing" | "published" | "retrying" | "failed" | "cancelled";
    attempts: number;
    maxAttempts: number;
    scheduledAt: string;
    lastError?: string;
  };
  auditEvents: Array<{
    id: string;
    eventType: string;
    message: string;
    timestamp: number;
    details?: Record<string, unknown>;
  }>;
}

export const schedulingApi = {
  schedulePost: async (payload: SchedulePostPayload) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Schedule API error ${response.status}`);
    }

    return response.json();
  },

  publishPostNow: async (postId: string) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/publish`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Publish Now error ${response.status}`);
    }

    return response.json();
  },

  reschedulePost: async (postId: string, date: string, time?: string) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/reschedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ date, time }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Reschedule error ${response.status}`);
    }

    return response.json();
  },

  cancelScheduledPost: async (postId: string) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/cancel`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Cancel error ${response.status}`);
    }

    return response.json();
  },

  getScheduledPosts: async (): Promise<ScheduledPostItem[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/scheduled-posts`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Get scheduled posts error ${response.status}`);
    }

    const json = await response.json();
    return json.data || [];
  },

  getJobAuditDetail: async (jobId: string): Promise<JobAuditDetail> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/jobs/${jobId}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Get job detail error ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  },

  retryJob: async (jobId: string) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/jobs/${jobId}/retry`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Retry job error ${response.status}`);
    }

    return response.json();
  },
};
