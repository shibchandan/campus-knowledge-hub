import { env } from "../config/env.js";
import crypto from "crypto";

export function securityHeaders(req, res, next) {
  // ── NIST CSF 2.0 PR.PS-01 / CWE-319 ─────────────────────────────────────
  // Enforce HTTPS — reject all plain-HTTP requests in production
  if (env.enforceHttps) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isHttps = req.secure || forwardedProto === "https";

    if (!isHttps) {
      const error = new Error("HTTPS is required for this environment.");
      error.statusCode = 403;
      return next(error);
    }
  }

  // ── Remove server fingerprinting headers (MITRE T1592) ───────────────────
  res.removeHeader("Server");
  res.removeHeader("X-Powered-By");

  // ── Per-request CSP nonce (OWASP A03 / CWE-79 XSS defense) ──────────────
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;

  // ── OWASP Secure Headers Project — full set ──────────────────────────────
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  // COOP: prevents cross-origin window access (Spectre/side-channel defense)
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // COEP: ensures all sub-resources are explicitly opted-in (CORP/COEP chain)
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; upgrade-insecure-requests; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
  );

  // ── HSTS — NIST SP 800-52 Rev2 / CWE-319 ────────────────────────────────
  if (env.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // ── Prevent API response caching on clients (NIST PR.DS-01) ─────────────
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
  }

  return next();
}
