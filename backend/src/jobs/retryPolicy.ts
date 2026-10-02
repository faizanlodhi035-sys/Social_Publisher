import type { ErrorCategory } from "./types.js";

export function classifyError(error: unknown): { category: ErrorCategory; isRetryable: boolean; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("token expired") || lower.includes("reconnect") || lower.includes("unauthorized") || lower.includes("invalid_grant")) {
    return { category: "authentication", isRetryable: false, message };
  }

  if (lower.includes("permission denied") || lower.includes("access denied") || lower.includes("forbidden")) {
    return { category: "authorization", isRetryable: false, message };
  }

  if (lower.includes("media") || lower.includes("file not found") || lower.includes("unsupported type") || lower.includes("larger than")) {
    return { category: "media", isRetryable: false, message };
  }

  if (lower.includes("invalid caption") || lower.includes("exceeds limit") || lower.includes("validation")) {
    return { category: "validation", isRetryable: false, message };
  }

  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return { category: "rate_limited", isRetryable: true, message };
  }

  if (lower.includes("timeout") || lower.includes("econnreset") || lower.includes("network") || lower.includes("503") || lower.includes("502") || lower.includes("500")) {
    return { category: "transient", isRetryable: true, message };
  }

  if (lower.includes("graph api error") || lower.includes("tiktok") || lower.includes("youtube")) {
    return { category: "provider", isRetryable: true, message };
  }

  return { category: "unknown", isRetryable: true, message };
}

export function calculateNextAttempt(attemptNumber: number, category: ErrorCategory): number {
  if (category === "rate_limited") {
    // 5 minutes for rate limit backoff
    return Date.now() + 5 * 60 * 1000;
  }

  // Bounded exponential backoff:
  // Attempt 1: +15 seconds
  // Attempt 2: +60 seconds (1 min)
  // Attempt 3: +300 seconds (5 mins)
  const baseDelaysMs = [15 * 1000, 60 * 1000, 300 * 1000];
  const delayMs = baseDelaysMs[Math.min(attemptNumber - 1, baseDelaysMs.length - 1)];

  return Date.now() + delayMs;
}
