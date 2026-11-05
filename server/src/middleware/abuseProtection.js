import { env } from "../config/env.js";

// ── MITRE ATT&CK T1190: Exploit Public-Facing Application ──────────────────
// Extended WAF pattern list covering OWASP Top 10 + MITRE ATT&CK T1059/T1190
const suspiciousPathPatterns = [
  /\/\.env/i,
  /\/wp-admin/i,
  /\/wp-login\.php/i,
  /\/phpmyadmin/i,
  /\/cgi-bin/i,
  /\/actuator/i,
  /\/vendor\/phpunit/i,
  /\/boaform/i,
  // SSRF probes — cloud metadata endpoints (MITRE T1552.005)
  /\/169\.254\.169\.254/,
  /\/metadata\/instance/i,
  // Common scanner fingerprints
  /\/\.git\//i,
  /\/\.svn\//i,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
  /\/config\.php/i,
  /\/server-status/i,
];

const suspiciousPayloadPatterns = [
  // Path traversal (MITRE T1083)
  /(\.\.\/|\.\.\\)/i,
  // XSS vectors (OWASP A03)
  /(<script|javascript:|onerror=|onload=|<iframe|<object|<embed)/i,
  // SQL injection (OWASP A03, MITRE T1190)
  /(union(\s+all)?\s+select|information_schema|drop\s+table|insert\s+into|delete\s+from|select\s+.*\s+from)/i,
  // OS command injection (MITRE T1059)
  /(cmd=|powershell|\/bin\/sh|\/bin\/bash|wget\s|curl\s|exec\(|system\(|passthru\()/i,
  // NoSQL injection — MongoDB operator injection (OWASP A03)
  /(\$where|\$expr|\$function|\$accumulator|\$gt.*\$lt|\$regex.*\$options)/i,
  // Server-Side Template Injection — SSTI (OWASP A03)
  /(\{\{.*\}\}|<%.*%>|\$\{.*\})/i,
  // XXE / XML injection (OWASP A05)
  /(<!ENTITY|<!DOCTYPE.*SYSTEM|SYSTEM\s+"http)/i,
  // SSRF payloads targeting internal services (MITRE T1552.005)
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254|::1|file:\/\/)/i,
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
