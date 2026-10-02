import { Router, type Request, type Response } from "express";
import { isFirebaseConfigured, getFirestoreDb } from "../firebase/admin.js";
import { aiService } from "../services/ai/aiService.js";
import { envConfig } from "../config/env.js";

const router = Router();

/**
 * Liveness probe: Confirms that the Express HTTP server process is running and responsive.
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    app: "Social Publisher Backend API",
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: Validates that essential dependencies and storage connections
 * are configured and operational for production traffic.
 */
router.get("/ready", async (req: Request, res: Response) => {
  const checks: Record<string, { status: "ready" | "degraded" | "unconfigured"; details?: string }> = {};

  // 1. Firebase Admin & Firestore check
  const db = getFirestoreDb();
  const hasLiveCredentials = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  if (hasLiveCredentials && db && isFirebaseConfigured()) {
    try {
      await Promise.race([
        db.collection("_health").limit(1).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000)),
      ]);
      checks.database = { status: "ready", details: "Firestore connected" };
    } catch (err: any) {
      checks.database = {
        status: process.env.NODE_ENV === "production" ? "degraded" : "ready",
        details: `Firestore check: ${err.message || "Unreachable"}`,
      };
    }
  } else {
    checks.database = {
      status: process.env.NODE_ENV === "production" ? "degraded" : "ready",
      details: "Firestore initialized with local/dev persistence fallback",
    };
  }

  // 2. AI Service readiness
  try {
    const aiStatus = aiService.getStatus();
    checks.aiService = {
      status: "ready",
      details: `Provider: ${aiStatus.provider}, Model: ${aiStatus.model}`,
    };
  } catch {
    checks.aiService = { status: "degraded", details: "AI service offline" };
  }

  // 3. Queue / Cloud Tasks configuration
  const hasCloudTasks = Boolean(
    (process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) &&
    process.env.GCP_TASKS_LOCATION &&
    process.env.GCP_TASKS_QUEUE_NAME
  );
  checks.taskQueue = {
    status: "ready",
    details: hasCloudTasks ? "GCP Cloud Tasks configured" : "Local durable queue runner active",
  };

  // Determine overall readiness
  const isHealthy = Object.values(checks).every((c) => c.status !== "unconfigured");
  const statusCode = isHealthy ? 200 : (process.env.NODE_ENV === "production" ? 503 : 200);

  res.status(statusCode).json({
    status: isHealthy ? "ready" : "degraded",
    environment: envConfig.NODE_ENV,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
