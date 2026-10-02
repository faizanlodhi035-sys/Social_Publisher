import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root or workspace root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const envConfig = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:4000",
  NODE_ENV: process.env.NODE_ENV || "development",
  SESSION_SECRET: process.env.SESSION_SECRET || "social_publisher_dev_secret_key_change_in_prod",
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET || "dev_aes_encryption_secret_key_1234567890",
  WORKER_SECRET: process.env.WORKER_SECRET || process.env.SESSION_SECRET || "social_publisher_dev_secret_key_change_in_prod",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS ? parseInt(process.env.AI_TIMEOUT_MS, 10) : 25000,
  AI_PROVIDER: (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "mock")) as "gemini" | "mock",
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || "social_publisher_webhook_secret_verify_token",

  meta: {
    appId: process.env.META_APP_ID || "demo_meta_app_id",
    appSecret: process.env.META_APP_SECRET || "demo_meta_app_secret",
    redirectUri: process.env.META_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:4000"}/api/auth/facebook/callback`,
  },

  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || "demo_tiktok_client_key",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || "demo_tiktok_client_secret",
    redirectUri: process.env.TIKTOK_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:4000"}/api/auth/tiktok/callback`,
  },

  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || "demo_google_client_id",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "demo_google_client_secret",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:4000"}/api/auth/youtube/callback`,
  },
};

/**
 * Validates environment configuration at startup.
 * In production, fails fast if critical security secrets are missing or using insecure dev defaults.
 */
export function validateEnv() {
  const isProd = envConfig.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isProd) {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "social_publisher_dev_secret_key_change_in_prod") {
      errors.push("SESSION_SECRET must be set to a secure, unique secret in production.");
    }

    if (!process.env.ENCRYPTION_SECRET && !process.env.SESSION_SECRET) {
      errors.push("ENCRYPTION_SECRET must be configured for AES-256-GCM token protection.");
    }

    if (!process.env.FIREBASE_PROJECT_ID) {
      warnings.push("FIREBASE_PROJECT_ID is not configured. Firestore / Firebase Admin may fail in production.");
    }

    if (!envConfig.GEMINI_API_KEY) {
      warnings.push("GEMINI_API_KEY is not configured. AI endpoints will run in simulated fallback mode.");
    }

    if (errors.length > 0) {
      console.error("[FATAL: Insecure Production Configuration Detected]");
      for (const err of errors) {
        console.error(` - ${err}`);
      }
      throw new Error(`Production startup aborted due to missing configuration: ${errors.join("; ")}`);
    }

    if (warnings.length > 0) {
      console.warn("[Production Configuration Warning]:", warnings);
    }
  } else {
    if (!envConfig.GEMINI_API_KEY) {
      warnings.push("GEMINI_API_KEY is not set. AI features run with simulated Mock provider.");
    }
    if (warnings.length > 0) {
      console.log(`[Dev Env] Active with non-blocking defaults (${warnings.length} notice)`);
    }
  }
}
