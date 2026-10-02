# Production Smoke-Test Protocol for Social Publisher

## Overview
This document provides a 19-step manual smoke testing sequence to verify all frontend pages, background queue flows, social webhooks, AI services, and security boundaries before production deployment.

---

## Smoke-Test Sequence

### 1. Dashboard Page & Overview (`/dashboard`)
- [x] Open `/dashboard`.
- [x] Verify metric cards load without runtime errors.
- [x] Verify recent activity timeline renders accurately.

### 2. Social Accounts Management (`/accounts`)
- [x] Open `/accounts`.
- [x] Verify Meta, TikTok, and YouTube account connection statuses display `Connected` or `Reauthorization Required`.
- [x] Test OAuth initiation buttons for each provider.

### 3. Create Post Composer (`/create-post`)
- [x] Open `/create-post`.
- [x] Toggle platform selection checkboxes (Instagram, Facebook, TikTok, YouTube).
- [x] Enter post caption text and add image/video media.
- [x] Verify client-side character limit validation per platform.

### 4. Immediate Publishing Queue
- [x] Click **Publish Now**.
- [x] Verify backend creates independent publishing jobs per platform in Firestore `workspaces/{workspaceId}/publishingJobs`.
- [x] Verify background publisher worker claims job atomically (`claimJob()`).
- [x] Verify status transitions to `Publishing` and then `Published`.

### 5. Multi-Platform Post Scheduling
- [x] In `/create-post`, enable **Schedule Post**.
- [x] Select a future date and time.
- [x] Click **Schedule Post**.
- [x] Verify jobs are queued with `status: "scheduled"` and target `scheduledAt` timestamp.

### 6. Social Calendar Integration (`/calendar`)
- [x] Open `/calendar`.
- [x] Verify scheduled post appears on target date cell.
- [x] Drag-and-drop a scheduled post to a new date.
- [x] Verify `reschedulePost()` API call updates Firestore timestamp.

### 7. Content Library (`/content`)
- [x] Open `/content`.
- [x] Filter by status (`Scheduled`, `Publishing`, `Published`, `Failed`).
- [x] Verify status badges display accurately.
- [x] Test retry button on failed posts.

### 8. Analytics Overview (`/analytics`)
- [x] Open `/analytics`.
- [x] Verify reach, impressions, engagement rate, and followers cards render from `analyticsApi.getOverview()`.
- [x] Change platform filter dropdown and verify aggregated chart update.

### 9. AI Caption & Hashtag Generation (`/ai-tools`)
- [x] Open `/ai-tools`.
- [x] Enter topic prompt and select target platform and tone.
- [x] Click **Generate Caption**.
- [x] Verify backend `/api/ai/caption` returns tailored copy.
- [x] Click **Generate Hashtags** and verify structured hashtag response.

### 10. AI Import to Create Post
- [x] On generated AI caption card in `/ai-tools`, click **Import into Create Post**.
- [x] Verify navigation state opens `/create-post` with initial caption populated.

### 11. Meta Webhook Verification & Processing
- [x] Send GET challenge request to `/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345`.
- [x] Verify response `200 OK` returning `12345`.
- [x] Send POST event with valid `X-Hub-Signature-256`.
- [x] Verify event normalization into Firestore `workspaces/{workspaceId}/socialEvents`.

### 12. TikTok Webhook Processing
- [x] Send POST payload to `/api/webhooks/tiktok`.
- [x] Verify event normalized and claimed idempotently.

### 13. YouTube WebSub Event Verification
- [x] Send GET challenge to `/api/webhooks/youtube?hub.challenge=yt_challenge_99`.
- [x] Verify `200 OK` response.

### 14. Webhook Event Deduplication
- [x] Send identical POST webhook payload twice with same `externalEventId`.
- [x] Verify second request is recognized as duplicate (`status: "already_processed"`) without duplicate business actions.

### 15. Engagement Metrics Synchronization
- [x] Verify incoming social events write normalized engagement metrics to `engagementSnapshots`.

### 16. Workspace Isolation & IDOR Verification
- [x] Pass unauthorized `x-workspace-id: unauthorized_workspace` header.
- [x] Verify `authMiddleware` rejects or scopes request safely.

### 17. Secret Scrubbing in Observability Logs
- [x] Inspect backend console logs during OAuth / AI requests.
- [x] Confirm no `access_token`, `refresh_token`, `client_secret`, or `GEMINI_API_KEY` values appear in logs.

### 18. Rate Limiting Verification
- [x] Send 25 rapid requests to `/api/ai/caption`.
- [x] Verify rate-limiter returns `429 Too Many Requests` with `Retry-After` header.

### 19. Rollback Readiness Test
- [x] Verify deployment rollback instructions documented in `PHASE_10.md` can restore previous build artifact without database corruption.
