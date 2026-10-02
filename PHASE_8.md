# PHASE 8: Real AI + Gemini Integration Architecture & Documentation

## Overview
Phase 8 connects the Social Publisher platform to Google Gemini AI for server-side AI content generation, introduces a clean `AIProvider` abstraction with both official `@google/genai` SDK integration and an offline `MockAIProvider`, runtime Zod schema validation, multi-language support (English, Urdu script, Roman Urdu), bounded timeouts, rate limiting, and zero-secret exposure.

---

## 1. Status Classification

- **[IMPLEMENTED]**:
  - `AIProvider` interface abstraction (`backend/src/services/ai/aiProvider.ts`).
  - `GeminiProvider` using official Google GenAI SDK (`@google/genai`).
  - `MockAIProvider` for deterministic testing and local offline execution without API keys.
  - Centralized prompt builders (`captionPrompt.ts`, `rewritePrompt.ts`, `ideasPrompt.ts`, `hashtagPrompt.ts`, `adaptationPrompt.ts`).
  - Runtime validation using `zod` for structured JSON model outputs.
  - All 5 operations: Caption Generator, Content Rewriting/Improvement, Content Ideas, Hashtag Generator, Platform Adaptation.
  - Bounded timeouts (`AI_TIMEOUT`) and controlled single retry on transient failures.
  - Rate limiting via `aiRateLimiter` (20 req/min per IP/route).
  - Firestore usage tracking under `workspaces/{workspaceId}/aiUsage/{usageId}` with safe metadata only.
  - Frontend client (`src/services/aiApi.ts`) and UI (`src/pages/AITools.tsx`) with real backend integration, language selector (English, Urdu, Roman Urdu), and seamless review flow into `CreatePost.tsx`.
  - Comprehensive automated test suite (`backend/src/tests/ai.test.ts`) with 10 passing tests.
- **[CONFIGURATION REQUIRED]**: Populating `GEMINI_API_KEY` and `GEMINI_MODEL` in production `backend/.env`.
- **[NO REGRESSIONS]**: All Phase 1–7 features (OAuth, Accounts, Posts, Calendar, Media Library, Publishing Worker, Scheduling) remain 100% operational.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------+
|                      AITools / CreatePost                   |
|                   (React 19 / Vite Frontend)                |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Frontend AI API Client                  |
|                    (src/services/aiApi.ts)                  |
+------------------------------+------------------------------+
                               | Authenticated HTTP
                               | (Bearer token / Session)
                               v
+-------------------------------------------------------------+
|                      Backend AI Router                      |
|                  (/api/ai/* in Express App)                 |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 Auth & Workspace Middleware                 |
|             (requireAuth, requireWorkspaceAccess)           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Backend AI Controller                   |
|             (backend/src/controllers/aiController.ts)       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Backend AI Service                     |
|              (backend/src/services/ai/aiService.ts)         |
|   - Input Bounds Validation                                 |
|   - Prompt Builder Execution                                |
|   - Zod Schema Output Validation                            |
|   - Safe Firestore Usage Logging                            |
+------------------------------+------------------------------+
                               |
          +--------------------+--------------------+
          |                                         |
          v                                         v
+-----------------------+                 +-----------------------+
|    GeminiProvider     |                 |     MockAIProvider    |
|   (@google/genai)     |                 |  (Offline / Testing)  |
+-----------+-----------+                 +-----------+-----------+
            |                                         |
            v                                         v
+-----------------------+                 +-----------------------+
|   Google Gemini API   |                 | Structured Simulation |
| (gemini-2.5-flash)    |                 +-----------------------+
+-----------+-----------+
            |
            v
   Structured JSON
            |
            v
   Zod Runtime Validation
            |
            v
   Frontend Response
            |
            v
   User Review / Edit
            |
            v
   CreatePost Page
            |
            v
   Phase 7 Background Queue (Publish / Schedule)
```

---

## 3. Files Created & Modified

### Backend Created
- `backend/src/services/ai/aiTypes.ts`: Strict TypeScript definitions for operations, requests, responses, models, and usage logs.
- `backend/src/services/ai/aiErrors.ts`: Error hierarchy (`AIError`, `AIValidationError`, `AITimeoutError`, `AIRateLimitError`, `AIProviderError`, `AIOutputParseError`, `AISafetyBlockError`).
- `backend/src/services/ai/aiProvider.ts`: Clean `AIProvider` interface abstraction.
- `backend/src/services/ai/geminiProvider.ts`: Production Gemini provider using official `@google/genai` SDK with timeout and secret scrubbing.
- `backend/src/services/ai/mockAIProvider.ts`: Mock provider for deterministic offline testing and local dev fallback.
- `backend/src/services/ai/prompts/captionPrompt.ts`: System prompt and JSON schema generator for captions.
- `backend/src/services/ai/prompts/rewritePrompt.ts`: System prompt for content rewriting and hook improvement.
- `backend/src/services/ai/prompts/ideasPrompt.ts`: System prompt for brainstorming structured content ideas.
- `backend/src/services/ai/prompts/hashtagPrompt.ts`: System prompt for categorized hashtag generation.
- `backend/src/services/ai/prompts/adaptationPrompt.ts`: System prompt for cross-platform content adaptation.
- `backend/src/services/ai/aiService.ts`: Core service orchestrator with Zod runtime schema validation, input bounds, and Firestore logging.
- `backend/src/services/ai/index.ts`: Clean export barrel.
- `backend/src/tests/ai.test.ts`: Automated 10-point test suite.

### Backend Modified
- `backend/src/services/aiService.ts`: Re-exported from `./ai/index.js` for full backward compatibility.
- `backend/src/controllers/aiController.ts`: Updated to handle `generateCaption`, `rewriteCaption`, `generateIdeas`, `generateHashtags`, `adaptContent`, `generateHooks`, and `getAIStatus`.
- `backend/src/routes/aiRoutes.ts`: Mounted full route suite.
- `backend/src/config/env.ts`: Added `GEMINI_MODEL`, `AI_TIMEOUT_MS`, and `AI_PROVIDER`.
- `backend/.env.example`: Documented Gemini environment variables.
- `backend/.env`: Configured dev defaults.

### Frontend Created / Modified
- `src/services/aiApi.ts`: Updated with full typed client methods: `generateCaption`, `rewriteCaption`, `generateContentIdeas`, `generateHashtags`, `adaptContent`, `generateHooks`, and `getAIStatus`.
- `src/pages/AITools.tsx`: Connected all 4 tool tabs to real backend API with multi-language selector (English, Urdu, Roman Urdu), loading spinners, error alerts, copy, regenerate, and "Use in Create Post" button.
- `src/pages/CreatePost.tsx`: Verified seamless import from `AITools` into editor, allowing user review before scheduling or publishing.

---

## 4. API Endpoints

| Method | Endpoint | Description | Payload Sample |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ai/status` | Returns provider & model info (never keys) | None |
| `POST` | `/api/ai/caption` | Generates platform-tailored post caption | `{ topic, platform, tone, length, language }` |
| `POST` | `/api/ai/rewrite` | Improves existing caption copy | `{ originalCaption, platform, tone, length, language }` |
| `POST` | `/api/ai/ideas` | Brainstorms structured content ideas | `{ topic, platform, tone, count, audience, language }` |
| `POST` | `/api/ai/hashtags` | Generates categorized hashtags | `{ topic, caption, platform, count }` |
| `POST` | `/api/ai/adapt` | Cross-platform content adaptation | `{ originalContent, sourcePlatform, targetPlatform, tone }` |
| `POST` | `/api/ai/hooks` | Short-form video hook suggestions | `{ topic, platform, count }` |

---

## 5. Security & Secret Protection Checklist

- [x] **Gemini API key backend-only**: Key resides exclusively in `backend/.env` / server memory.
- [x] **No VITE_GEMINI_API_KEY**: Zero client exposure; Vite bundle inspected.
- [x] **No Gemini secrets in Firestore**: Only metadata (model name, latency, operation, token count) logged.
- [x] **No Gemini secrets in API responses**: Verified via automated test `Test 10: Secret Protection Check`.
- [x] **Authentication required**: Enforced by `requireAuth` on all `/api/ai/*` routes.
- [x] **Workspace authorization enforced**: Requests scoped to `req.workspaceId` via `requireWorkspaceAccess`.
- [x] **Input bounds enforced**: Topics (≤ 1,000 chars), Captions (≤ 5,000 chars), count bounds (1–30), platform whitelisting.
- [x] **Output validated**: Runtime Zod validation verifies model JSON before returning to client.
- [x] **Provider errors sanitized**: Regex & string scrubbing prevents API keys in error traces.
- [x] **No automatic AI publishing**: Content requires explicit user review in `CreatePost` before Phase 7 dispatch.
- [x] **No bypass of Phase 7**: Scheduling and background workers handle all publishing tasks.

---

## 6. Build & Test Verification

1. **Automated AI Test Suite (`npx tsx src/tests/ai.test.ts`)**:
   - `Test 1: Caption Generation across languages (English, Urdu, Roman Urdu)`: **PASSED**
   - `Test 2: Content Rewriting / Improvement`: **PASSED**
   - `Test 3: Content Ideas Generation`: **PASSED**
   - `Test 4: Hashtag Generation`: **PASSED**
   - `Test 5: Platform Adaptation`: **PASSED**
   - `Test 6: Input Validation Bounds`: **PASSED**
   - `Test 7: Malformed Provider Output Handling`: **PASSED**
   - `Test 8: Timeout Handling`: **PASSED**
   - `Test 9: Controlled Retry Simulation`: **PASSED**
   - `Test 10: Secret Protection Check`: **PASSED**
   - **Result: 10 / 10 Tests Passed (0 errors)**

2. **Backend TypeScript Build (`cd backend && npm run build`)**:
   - `tsc` compilation: **0 errors**

3. **Frontend Vite Build (`npm run build`)**:
   - `tsc -b && vite build`: **0 errors** (1,942 modules transformed, bundle generated in 8.67s)
