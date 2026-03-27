import { env } from "../config/env.js";

const suspiciousPathPatterns = [
  /\/\.env/i,
  /\/wp-admin/i,
  /\/wp-login\.php/i,
  /\/phpmyadmin/i,
  /\/cgi-bin/i,
  /\/actuator/i,
  /\/vendor\/phpunit/i,
  /\/boaform/i
];

const suspiciousPayloadPatterns = [
  /(\.\.\/|\.\.\\)/i,
  /(<script|javascript:|onerror=)/i,
  /(union(\s+all)?\s+select|information_schema|drop\s+table)/i,
  /(cmd=|powershell|\/bin\/sh|wget\s|curl\s)/i
];

function createHttpError(message, statusCode = 403) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeIp(rawIp) {
  if (!rawIp) {
    return "unknown";
  }

  return String(rawIp).split(",")[0].trim();
}

function hasSuspiciousPath(pathname) {
  return suspiciousPathPatterns.some((pattern) => pattern.test(pathname));
}

function hasSuspiciousPayload(req) {
  const source = `${req.originalUrl || ""} ${JSON.stringify(req.body || {})}`.toLowerCase();
  return suspiciousPayloadPatterns.some((pattern) => pattern.test(source));
}

export function abuseProtection(req, _res, next) {
  if (!env.abuseProtectionEnabled) {
    return next();
  }

  const ip = normalizeIp(req.ip || req.headers["x-forwarded-for"] || "");
  const userAgent = String(req.headers["user-agent"] || "").trim();
  const requestPath = req.path || req.originalUrl || "";

  if (env.blockedIpSet.has(ip)) {
    return next(createHttpError("Request blocked by security policy."));
  }

  if (env.abuseRequireUserAgent && !userAgent) {
    return next(createHttpError("Missing user agent header."));
  }

  if (hasSuspiciousPath(requestPath)) {
    return next(createHttpError("Request blocked by WAF policy."));
  }

  if (hasSuspiciousPayload(req)) {
    return next(createHttpError("Suspicious request blocked."));
  }

  return next();
}
