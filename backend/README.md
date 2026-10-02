# Social Publisher Backend API

Production-ready Express & TypeScript backend owning OAuth 2.0 flows, token encryption/persistence abstractions, and social network publishing APIs for Meta (Facebook & Instagram), TikTok, and YouTube.

---

## 🛠️ Architecture & Setup

### 1. Structure Overview
```
backend/
  src/
    config/          # Validated environment configuration
    controllers/     # Express route handlers
    middleware/      # Error handler & CORS
    providers/       # Platform-specific OAuth & Publishing logic (Meta, TikTok, YouTube)
    repositories/    # Server-side account & token persistence abstraction
    routes/          # API route definitions (/auth, /accounts, /publish)
    services/        # Token refresh, OAuth workflow & publish orchestrations
    types/           # Shared backend TypeScript types
    utils/           # Crypto state generator & custom errors
    server.ts        # Express server entry point
  .env.example       # Sample environment configuration
  package.json
  tsconfig.json
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp .env.example .env
```

### Required Variables:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
SESSION_SECRET=a_long_random_secure_secret_key

# Meta Developer Credentials (Facebook & Instagram)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:4000/api/auth/facebook/callback

# TikTok Developer Credentials
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:4000/api/auth/tiktok/callback

# Google Cloud / YouTube Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/youtube/callback
```

---

## 🔑 Required Provider Scopes & Permissions

1. **Meta (Facebook & Instagram)**:
   - Permissions: `public_profile`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
   - Callback URL: `http://localhost:4000/api/auth/facebook/callback`
2. **TikTok**:
   - Scopes: `user.info.basic`, `video.upload`, `video.publish`.
   - Callback URL: `http://localhost:4000/api/auth/tiktok/callback`
3. **YouTube (Google)**:
   - Scopes: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/userinfo.profile`.
   - Callback URL: `http://localhost:4000/api/auth/youtube/callback`

---

## 🚀 Commands to Run

### Install Dependencies
```bash
cd backend
npm install
```

### Development Mode (with hot reloading)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

---

## 🔒 Security Principles

- **No Frontend Secrets:** App secrets, client secrets, and access tokens are kept 100% on the server.
- **CSRF State Tokens:** Generated using cryptographic nonces and validated during callbacks.
- **Tokens Isolation:** Sensitive access/refresh tokens are stripped before returning accounts to the frontend API client.
