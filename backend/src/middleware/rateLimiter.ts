import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Periodic cleanup of expired rate limit entries to prevent memory leaks (runs every 5 minutes)
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, 5 * 60 * 1000);
  // Ensure timer does not prevent process exit in tests
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Creates a lightweight in-memory rate limiter middleware compatible with Node/Express.
 * @param windowMs Time window in milliseconds.
 * @param maxRequests Maximum requests allowed within windowMs.
 */
export const createRateLimiter = (windowMs = 60000, maxRequests = 60) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Trusted internal worker invocations bypass rate limits
    if (req.headers["x-worker-token"]) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "global";
    const routeKey = `${req.baseUrl || ""}${req.path}_${ip}`;
    const now = Date.now();

    if (!store[routeKey] || now > store[routeKey].resetTime) {
      store[routeKey] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[routeKey].count += 1;
    if (store[routeKey].count > maxRequests) {
      const retryAfterSec = Math.ceil((store[routeKey].resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return next(
        new AppError(
          `Too many requests. Please try again in ${retryAfterSec} seconds.`,
          429,
          "TOO_MANY_REQUESTS"
        )
      );
    }

    next();
  };
};

export const aiRateLimiter = createRateLimiter(60000, 20); // 20 requests per minute
export const publishRateLimiter = createRateLimiter(60000, 30); // 30 requests per minute
export const authRateLimiter = createRateLimiter(60000, 20); // 20 OAuth/auth attempts per minute
export const generalRateLimiter = createRateLimiter(60000, 120); // 120 requests per minute
