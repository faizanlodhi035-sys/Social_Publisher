import type { Request, Response, NextFunction } from "express";

/**
 * Production Security Headers Middleware.
 * Applies OWASP recommended hardening headers without requiring heavy dependencies.
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking via iframes
  res.setHeader("X-Frame-Options", "DENY");

  // Legacy XSS filter protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Control referrer information leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Enforce HTTPS in production via HSTS
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
};
