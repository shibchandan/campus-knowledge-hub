import { env } from "../config/env.js";
import crypto from "crypto";

export function securityHeaders(req, res, next) {
  if (env.enforceHttps) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isHttps = req.secure || forwardedProto === "https";

    if (!isHttps) {
      const error = new Error("HTTPS is required for this environment.");
      error.statusCode = 403;
      return next(error);
    }
  }

  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; upgrade-insecure-requests; frame-ancestors 'none';`
  );
  res.setHeader("Expect-CT", "max-age=86400, enforce");

  if (env.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Prevent mobile browsers from caching API responses (they serve stale data)
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
  }

  return next();
}
