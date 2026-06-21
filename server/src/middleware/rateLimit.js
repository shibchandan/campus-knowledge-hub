import mongoose from "mongoose";
import { logAppEvent } from "../services/logger.service.js";

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

const rateLimitBucketSchema = new mongoose.Schema(
  {
    keyPrefix: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    windowStart: { type: Number, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true }
  },
  {
    collection: "rate_limit_buckets",
    versionKey: false
  }
);

rateLimitBucketSchema.index(
  { key: 1, windowStart: 1 },
  { unique: true, name: "uniq_rate_limit_key_window" }
);
rateLimitBucketSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_rate_limit_expiry" }
);

export const RateLimitBucket =
  mongoose.models.RateLimitBucket || mongoose.model("RateLimitBucket", rateLimitBucketSchema);

const rateLimitFallbackWarnings = new Map();

function shouldUseSharedStore() {
  return mongoose.connection.readyState === 1;
}

export function getWindowStart(now, windowMs) {
  return Math.floor(now / windowMs) * windowMs;
}

export function getExpiryDate(resetAt, windowMs) {
  return new Date(resetAt + Math.max(windowMs, 60_000));
}

function logFallbackRateLimitError(keyPrefix, error) {
  const now = Date.now();
  const previousWarningAt = rateLimitFallbackWarnings.get(keyPrefix) || 0;

  if (now - previousWarningAt < 60_000) {
    return;
  }

  rateLimitFallbackWarnings.set(keyPrefix, now);
  logAppEvent("warn", "rate_limit_shared_store_fallback", {
    keyPrefix,
    error: error.message
  });
}

async function incrementSharedHit({ keyPrefix, key, windowStart, resetAt, windowMs }) {
  try {
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { key, windowStart },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          keyPrefix,
          key,
          windowStart,
          expiresAt: getExpiryDate(resetAt, windowMs)
        }
      },
      {
        upsert: true,
        new: true
      }
    ).select("count");

    return bucket?.count || 1;
  } catch (error) {
    if (error?.code === 11000) {
      const bucket = await RateLimitBucket.findOneAndUpdate(
        { key, windowStart },
        { $inc: { count: 1 } },
        { new: true }
      ).select("count");

      return bucket?.count || 1;
    }

    throw error;
  }
}

function incrementLocalHit({ hits, key, now, resetAt }) {
  const record = hits.get(key);

  if (!record || record.resetAt <= now) {
    hits.set(key, { count: 1, resetAt });
    return 1;
  }

  record.count += 1;
  hits.set(key, record);
  return record.count;
}

function cleanupExpiredLocalHits(hits, now) {
  for (const [storedKey, storedRecord] of hits.entries()) {
    if (storedRecord.resetAt <= now) {
      hits.delete(storedKey);
    }
  }
}

function setRateLimitHeaders(res, { maxRequests, count, resetAt }) {
  if (!res || typeof res.set !== "function") {
    return;
  }

  res.set("X-RateLimit-Limit", String(maxRequests));
  res.set("X-RateLimit-Remaining", String(Math.max(maxRequests - count, 0)));
  res.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  res.set("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  message,
  keyPrefix = "global",
  keyGenerator = (req) => normalizeIp(req.ip || req.headers["x-forwarded-for"] || "")
}) {
  const hits = new Map();
  let cleanupCursor = Date.now();

  return async function rateLimiter(req, res, next) {
    const rawKey = keyGenerator(req);
    const key = `${keyPrefix}:${rawKey}`;
    const now = Date.now();
    const windowStart = getWindowStart(now, windowMs);
    const resetAt = windowStart + windowMs;

    if (now - cleanupCursor > windowMs) {
      cleanupExpiredLocalHits(hits, now);
      cleanupCursor = now;
    }

    try {
      const count = shouldUseSharedStore()
        ? await incrementSharedHit({ keyPrefix, key, windowStart, resetAt, windowMs })
        : incrementLocalHit({ hits, key, now, resetAt });

      setRateLimitHeaders(res, { maxRequests, count, resetAt });

      if (count > maxRequests) {
        next(createHttpError(message, 429));
        return;
      }

      next();
    } catch (error) {
      logFallbackRateLimitError(keyPrefix, error);
      const count = incrementLocalHit({ hits, key, now, resetAt });
      setRateLimitHeaders(res, { maxRequests, count, resetAt });

      if (count > maxRequests) {
        next(createHttpError(message, 429));
        return;
      }

      next();
    }
  };
}
