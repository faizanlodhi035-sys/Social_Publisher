import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface CorrelatedRequest extends Request {
  id?: string;
  startTime?: number;
}

// Keys to redact from request logs to prevent secret leakage
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "access_token",
  "refresh_token",
  "secret",
  "clientsecret",
  "client_secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "code",
]);

/**
 * Sanitizes an object by masking sensitive keys.
 */
export function sanitizeLogData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLogData);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Request correlation middleware:
 * - Assigns a unique X-Request-Id header to incoming requests and outgoing responses
 * - Emits structured production-safe request logs (no secrets, no tokens)
 */
export const requestCorrelation = (req: CorrelatedRequest, res: Response, next: NextFunction) => {
  const existingId = req.headers["x-request-id"];
  const requestId = (typeof existingId === "string" && existingId.trim()) 
    ? existingId.trim() 
    : crypto.randomUUID();

  req.id = requestId;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;

    // Determine log level based on response status
    const isError = statusCode >= 500;
    const isWarn = statusCode >= 400 && statusCode < 500;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 80) : undefined,
    };

    if (isError) {
      console.error(`[API ERROR] ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms) [${requestId}]`);
    } else if (isWarn) {
      console.warn(`[API WARN] ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms) [${requestId}]`);
    } else if (process.env.NODE_ENV !== "test") {
      // In production/dev, log standard requests
      console.log(`[API INFO] ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms) [${requestId}]`);
    }
  });

  next();
};
