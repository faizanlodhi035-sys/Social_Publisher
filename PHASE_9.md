# Phase 9 — Production Hardening, Security & Firebase Deployment

## Overview

Phase 9 hardens the entire Social Publisher application for production and configures a clean, secure Firebase deployment architecture. It enforces strict multi-tenant isolation, cryptographic protection for sensitive tokens, internal worker authentication, rate limiting, OWASP security headers, health/readiness observability, and zero client-side secret exposure.

---

## 1. Architecture

```
LOCAL ENVIRONMENT
  ↓
Vite Dev Server (Port 5173) ──► Express Backend (Port 4000)
                                   ├── Firebase Emulators (Firestore: 8080, Storage: 9199)
                                   └── Local Durable Task Runner / Mock AI Provider

PRODUCTION ARCHITECTURE
  ↓
Firebase Hosting (CDN) ────► Static React 19 Frontend SPA (Vite Production Bundle)
  ↓ (/api/* proxy / Cloud Run URL)
Cloud Run / Cloud Functions ──► Express Backend API
  ├── Cloud Tasks Queue ──────► Background Worker (`POST /api/internal/publishing-jobs/:id/process`)
  ├── Firestore ──────────────► Tenant-isolated Collections + Rules Enforced
  ├── Firebase Storage ───────► Workspace-Scoped Media Assets
  ├── Google Gemini API ──────► Backend-only GenAI Service
  └── External Social APIs ───► Meta Graph API, TikTok API, YouTube Data API
```

---

## 2. Security Hardening Summary

| Area | Implementation & Protection Mechanism |
| :--- | :--- |
| **Token Encryption** | Tokens (`access_token`, `refresh_token`) encrypted using **AES-256-GCM** with unique 96-bit IVs and authentication tags. Stored under restricted `workspaces/{id}/accounts/{id}/secrets` collection. |
| **OAuth CSRF Protection** | HMAC-SHA256 signed `state` parameter binds target platform, timestamp, and verified `workspaceId`. Tampered or replayed state tokens are rejected. |
| **Multi-Tenant Isolation (IDOR)** | Server-authoritative `req.workspaceId` verified against caller's profile and membership. Unmatched cross-workspace requests return `403 WORKSPACE_ACCESS_DENIED`. |
| **Internal Worker Security** | `/api/internal/publishing-jobs/:jobId/process` requires constant-time secret matching (`timingSafeMatch`) or Cloud Tasks OIDC headers. Unauthenticated requests rejected with `401`. |
| **OWASP Security Headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. HSTS active in production. |
| **Request Correlation** | Unique `X-Request-Id` UUID attached to all requests and response headers with structured logging and secret masking. |
| **Body Size Limits** | JSON and URL-encoded bodies capped at `2MB` to prevent memory exhaustion DoS attacks. Media continues using Firebase Storage streaming. |
| **Rate Limiting** | Sliding window rate limiters for AI (`20 req/min`), Publishing (`30 req/min`), and OAuth/Auth (`20 req/min`) with automatic memory garbage collection. |
| **Firestore Rules** | Workspaces partition data. `secrets` subcollection is `allow read, write: if false;`. Server-managed fields (`providerPostId`, `publishedAt`, job statuses) cannot be client-forged. |
| **Storage Rules** | `workspaces/{workspaceId}/media/**` requires verified `isWorkspaceMember(workspaceId)` for writes and deletes, with 100MB max size and image/video MIME enforcement. |

---

## 3. Environment Variables Reference

### Frontend Client (`.env` — Public / Browser Safe)
> **CRITICAL:** Only variables prefixed with `VITE_` are included in the frontend build. Never put server secrets in the client `.env`.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.yourdomain.com/api` or `/api` |
| `VITE_FIREBASE_API_KEY` | Public Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket | `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:1234567890:web:abc...` |

### Backend Server (`backend/.env` — Strictly Confidential)
> **CRITICAL:** Store in Google Cloud Secret Manager or Cloud Run Environment Variables in production.

| Variable | Description |
| :--- | :--- |
| `PORT` | HTTP Port for Express server (`4000` default) |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) |
| `FRONTEND_URL` | Allowed frontend origin for CORS (`https://yourdomain.com`) |
| `BACKEND_URL` | Public URL of backend API for callbacks |
| `ALLOWED_ORIGINS` | Comma-separated list of additional trusted origins |
| `SESSION_SECRET` | Cryptographic secret for signing cookies and internal worker tokens (32+ chars) |
| `ENCRYPTION_SECRET` | AES-256-GCM encryption key for social OAuth tokens |
| `WORKER_SECRET` | Shared secret for Cloud Tasks worker authorization |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (`"-----BEGIN PRIVATE KEY-----\n..."`) |
| `FIREBASE_STORAGE_BUCKET`| Target bucket for media uploads |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `GEMINI_MODEL` | Gemini model name (`gemini-2.5-flash`) |
| `GCP_PROJECT_ID` | GCP Project ID for Cloud Tasks |
| `GCP_TASKS_LOCATION` | GCP Cloud Tasks region (`us-central1`) |
| `GCP_TASKS_QUEUE_NAME` | Cloud Tasks queue identifier |
| `META_APP_ID` | Meta / Facebook App ID |
| `META_APP_SECRET` | Meta / Facebook App Secret |
| `TIKTOK_CLIENT_KEY` | TikTok Developer Client Key |
| `TIKTOK_CLIENT_SECRET` | TikTok Developer Client Secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for YouTube |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

---

## 4. Health & Observability

### Liveness Probe: `GET /api/health`
- **Purpose:** Verifies that the Express server process is running and responsive.
- **HTTP Status:** `200 OK`
- **Response Format:**
  ```json
  {
    "status": "ok",
    "app": "Social Publisher Backend API",
    "version": "1.0.0",
    "uptimeSeconds": 142,
    "timestamp": "2026-10-01T15:00:00.000Z"
  }
  ```

### Readiness Probe: `GET /api/ready`
- **Purpose:** Verifies connectivity to Firestore, Firebase Admin initialization, AI model configuration, and task queue readiness without exposing secrets.
- **HTTP Status:** `200 OK` (or `503 Service Unavailable` if critical production components fail).
- **Response Format:**
  ```json
  {
    "status": "ready",
    "environment": "production",
    "checks": {
      "database": { "status": "ready", "details": "Firestore connected" },
      "aiService": { "status": "ready", "details": "Provider: gemini, Model: gemini-2.5-flash" },
      "taskQueue": { "status": "ready", "details": "GCP Cloud Tasks configured" }
    },
    "timestamp": "2026-10-01T15:00:00.000Z"
  }
  ```

---

## 5. Deployment Guide

### A. Pre-Deployment Validation
Run the full verification suite before any production release:
```bash
# 1. Typecheck entire repository
npm run typecheck

# 2. Run automated AI and Security test suites (36 tests)
npm run test

# 3. Build frontend bundle
npm run build

# 4. Build backend bundle
npm run build:backend
```

### B. Deploying Frontend to Firebase Hosting
```bash
# Deploy static assets and SPA rewrites
npm run deploy:hosting
```

### C. Deploying Firestore & Storage Rules
```bash
# Deploy hardened Firestore security rules and composite indexes
npm run deploy:firestore

# Deploy workspace-enforced Storage security rules
npm run deploy:storage
```

### D. Deploying Backend to Google Cloud Run
```bash
gcloud run deploy social-publisher-backend \
  --source=./backend \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production,FIREBASE_PROJECT_ID=your-project-id \
  --set-secrets=SESSION_SECRET=SESSION_SECRET:latest,ENCRYPTION_SECRET=ENCRYPTION_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 6. Local Development with Firebase Emulators

To run full Firestore and Storage emulators locally without live GCP costs:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Start the emulators:
   ```bash
   npm run emulators
   ```
3. Connect the backend to local emulators:
   In `backend/.env`:
   ```env
   FIRESTORE_EMULATOR_HOST=localhost:8080
   FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
   ```
4. Start development servers:
   ```bash
   npm run dev           # Frontend on http://localhost:5173
   npm run dev:backend   # Backend on http://localhost:4000
   ```

---

## 7. Rollback & Disaster Recovery Guidance

1. **Hosting Rollback:**
   In the Firebase Console under **Hosting**, or via CLI:
   ```bash
   firebase hosting:clone <source-site>:<versionId> <target-site>:live
   ```
2. **Rules Rollback:**
   Firestore and Storage rules are version-controlled in Git (`firestore.rules`, `storage.rules`). Re-deploying an earlier commit takes < 30 seconds:
   ```bash
   git checkout <stable-commit> -- firestore.rules storage.rules
   npm run deploy:firestore
   npm run deploy:storage
   ```
3. **Database Compatibility:**
   All Phase 9 Firestore structures are backward-compatible. AES-256-GCM token decryption includes fallback for legacy unencrypted tokens, preventing breaking changes.
