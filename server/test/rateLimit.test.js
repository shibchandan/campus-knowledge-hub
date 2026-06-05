import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createRateLimiter } from "../src/middleware/rateLimit.js";

async function invokeLimiter(limiter, reqOverrides = {}) {
  const responseHeaders = {};
  const requestHeaders = {
    "user-agent": "test-agent",
    ...(reqOverrides.headers || {})
  };

  const req = {
    ip: "127.0.0.1",
    headers: requestHeaders,
    ...reqOverrides,
    headers: requestHeaders
  };

  return new Promise((resolve) => {
    limiter(
      req,
      {
        set(name, value) {
          responseHeaders[name] = value;
        }
      },
      (error) => resolve({ error: error || null, headers: responseHeaders })
    );
  });
}

test("rate limiter falls back to local memory and blocks after the configured limit", async () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    message: "Too many requests.",
    keyPrefix: "test-local"
  });

  const firstAttempt = await invokeLimiter(limiter);
  const secondAttempt = await invokeLimiter(limiter);
  const thirdAttempt = await invokeLimiter(limiter);

  assert.equal(firstAttempt.error, null);
  assert.equal(firstAttempt.headers["X-RateLimit-Limit"], "2");
  assert.equal(firstAttempt.headers["X-RateLimit-Remaining"], "1");

  assert.equal(secondAttempt.error, null);
  assert.equal(secondAttempt.headers["X-RateLimit-Remaining"], "0");

  assert.ok(thirdAttempt.error);
  assert.equal(thirdAttempt.error.message, "Too many requests.");
  assert.equal(thirdAttempt.error.statusCode, 429);
  assert.equal(thirdAttempt.headers["X-RateLimit-Remaining"], "0");
});

test("rate limiter tracks different IPs independently", async () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 1,
    message: "Too many requests.",
    keyPrefix: "test-ips"
  });

  const firstIpAttempt = await invokeLimiter(limiter, { ip: "10.0.0.1" });
  const secondIpAttempt = await invokeLimiter(limiter, { ip: "10.0.0.2" });
  const repeatedFirstIpAttempt = await invokeLimiter(limiter, { ip: "10.0.0.1" });

  assert.equal(firstIpAttempt.error, null);
  assert.equal(secondIpAttempt.error, null);
  assert.ok(repeatedFirstIpAttempt.error);
  assert.equal(repeatedFirstIpAttempt.error.statusCode, 429);
});

test("rate limiter falls back to local memory if the shared store errors", async () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    message: "Too many requests.",
    keyPrefix: "test-shared-fallback"
  });

  const originalReadyState = mongoose.connection.readyState;
  const model = mongoose.models.RateLimitBucket;
  const originalFindOneAndUpdate = model.findOneAndUpdate;

  mongoose.connection.readyState = 1;
  model.findOneAndUpdate = () => {
    return {
      select: async () => {
        throw new Error("shared store unavailable");
      }
    };
  };

  try {
    const firstAttempt = await invokeLimiter(limiter, { ip: "10.0.0.3" });
    const secondAttempt = await invokeLimiter(limiter, { ip: "10.0.0.3" });
    const thirdAttempt = await invokeLimiter(limiter, { ip: "10.0.0.3" });

    assert.equal(firstAttempt.error, null);
    assert.equal(secondAttempt.error, null);
    assert.ok(thirdAttempt.error);
    assert.equal(thirdAttempt.error.statusCode, 429);
  } finally {
    model.findOneAndUpdate = originalFindOneAndUpdate;
    mongoose.connection.readyState = originalReadyState;
  }
});
