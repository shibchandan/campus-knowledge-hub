function createHttpError(message, statusCode = 429) {
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

export function createRateLimiter({ windowMs, maxRequests, message, keyPrefix = "global" }) {
  const hits = new Map();
  let cleanupCursor = Date.now();

  return function rateLimiter(req, _res, next) {
    const ip = normalizeIp(req.ip || req.headers["x-forwarded-for"] || "");
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const record = hits.get(key);

    if (now - cleanupCursor > windowMs) {
      for (const [storedKey, storedRecord] of hits.entries()) {
        if (storedRecord.resetAt <= now) {
          hits.delete(storedKey);
        }
      }
      cleanupCursor = now;
    }

    if (!record || record.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      next(createHttpError(message));
      return;
    }

    record.count += 1;
    hits.set(key, record);
    next();
  };
}
