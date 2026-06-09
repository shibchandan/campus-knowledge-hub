const cache = new Map();

/**
 * Express middleware to cache GET responses in memory.
 * @param {number} durationSeconds - Cache TTL in seconds (default: 5 minutes)
 */
export function cacheMiddleware(durationSeconds = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const userPart = req.user ? `${req.user.role}:${req.user.collegeName || ""}` : "anonymous";
    const key = `${userPart}:${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse && cachedResponse.expiry > Date.now()) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cachedResponse.data);
    }

    // Capture the original res.json behavior
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data: body,
          expiry: Date.now() + durationSeconds * 1000
        });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Invalidates cache keys matching the provided string or pattern.
 * @param {string|RegExp} urlPattern
 */
export function invalidateCache(urlPattern) {
  const pattern = typeof urlPattern === "string" ? new RegExp(urlPattern) : urlPattern;
  for (const key of cache.keys()) {
    if (pattern.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Express middleware to invalidate cache patterns on successful write operations (POST, PUT, PATCH, DELETE).
 * @param {string|RegExp} urlPattern
 */
export function invalidateCacheMiddleware(urlPattern) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache(urlPattern);
      }
    });
    next();
  };
}
