import { env } from "../config/env.js";

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

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (env.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return next();
}
