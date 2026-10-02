import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { envConfig } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import publishRoutes from "./routes/publishRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import schedulingRoutes from "./routes/schedulingRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { handleOAuthCallback } from "./controllers/authController.js";
import { requireAuth, requireWorkspaceAccess } from "./middleware/authMiddleware.js";
import { aiRateLimiter, publishRateLimiter, authRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestCorrelation } from "./middleware/requestCorrelation.js";

export function createApp() {
  const app = express();

  // 1. Request Correlation & Structured Logging
  app.use(requestCorrelation);

  // 2. Production Security Headers (OWASP)
  app.use(securityHeaders);

  // 3. Strict Production CORS
  const allowedOrigins = [
    envConfig.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    ...envConfig.ALLOWED_ORIGINS,
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-Workspace-Id",
        "X-User-Id",
        "X-User-Email",
        "X-Worker-Token",
        "X-Saas-Admin",
      ],
    })
  );

  // 4. Request Body Limits (DoS protection)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(cookieParser(envConfig.SESSION_SECRET));

  // ==============================================================================
  // Public Endpoints (No Bearer token required)
  // ==============================================================================

  // Liveness & Readiness Probes
  app.use("/api", healthRoutes);

  // Internal Worker Endpoint (Protected by worker token / Cloud Tasks headers)
  app.use("/api", internalRoutes);

  // OAuth Callback (Protected by cryptographically signed HMAC state token)
  app.get("/api/auth/:platform/callback", handleOAuthCallback);

  // External Social Webhooks (Protected by webhook signatures)
  app.use("/api", webhookRoutes);

  // OAuth Initiation & Status (Moved to public so browser redirects work)
  app.use("/api/auth", authRateLimiter, authRoutes);

  // ==============================================================================
  // Protected Endpoints (Strictly require Bearer Token & Workspace Access)
  // ==============================================================================
  const apiRouter = express.Router();
  apiRouter.use(requireAuth, requireWorkspaceAccess);

  // Workspace Social Accounts
  apiRouter.use(accountRoutes);

  // Publishing & Scheduling
  apiRouter.use(publishRateLimiter, publishRoutes);
  apiRouter.use(publishRateLimiter, schedulingRoutes);
  apiRouter.use(jobRoutes);

  // Media Library
  apiRouter.use(mediaRoutes);

  // Posts Content
  apiRouter.use(postRoutes);

  // Gemini AI Tools
  apiRouter.use("/ai", aiRateLimiter, aiRoutes);

  // Analytics & Admin
  apiRouter.use(analyticsRoutes);
  apiRouter.use(adminRoutes);

  app.use("/api", apiRouter);

  // 404 Handler for Unmatched API Routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `API route '${req.method} ${req.originalUrl}' does not exist.`,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
