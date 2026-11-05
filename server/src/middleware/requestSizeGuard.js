// ── NIST CSF 2.0 PR.PS-04 / CWE-400 — Uncontrolled Resource Consumption ─────
// Enforces per-route JSON body size limits beyond Express's global 10mb limit.
// Prevents DoS attacks via intentionally oversized payloads on specific endpoints.

function createHttpError(message, statusCode = 413) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Returns middleware that blocks requests whose JSON body exceeds `maxBytes`.
 * @param {number} maxBytes - Maximum allowed body size in bytes.
 */
export function requestSizeGuard(maxBytes) {
  return function sizeGuardMiddleware(req, _res, next) {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > maxBytes) {
      return next(
        createHttpError(
          `Request body too large. Maximum allowed size is ${Math.round(maxBytes / 1024)}KB for this endpoint.`
        )
      );
    }

    next();
  };
}

// Pre-configured guards for common use cases
export const tightSizeGuard = requestSizeGuard(16 * 1024);       //  16 KB — auth endpoints
export const normalSizeGuard = requestSizeGuard(256 * 1024);     // 256 KB — standard API calls
export const relaxedSizeGuard = requestSizeGuard(1024 * 1024);   //   1 MB — rich content (AI, quizzes)
