import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { cacheMiddleware, invalidateCacheMiddleware, invalidateCache } from "../src/middleware/cacheMiddleware.js";

test("cacheMiddleware caches GET requests and returns X-Cache headers", async () => {
  const app = express();
  let callCount = 0;

  app.get("/test", cacheMiddleware(5), (req, res) => {
    callCount++;
    res.json({ count: callCount });
  });

  // First request: MISS
  const res1 = await request(app).get("/test");
  assert.equal(res1.status, 200);
  assert.equal(res1.headers["x-cache"], "MISS");
  assert.equal(res1.body.count, 1);
  assert.equal(callCount, 1);

  // Second request: HIT
  const startTime = performance.now();
  const res2 = await request(app).get("/test");
  const duration = performance.now() - startTime;

  assert.equal(res2.status, 200);
  assert.equal(res2.headers["x-cache"], "HIT");
  assert.equal(res2.body.count, 1); // should be cached value
  assert.equal(callCount, 1); // handler should not be called again
  assert.ok(duration < 20, `Cache hit response took too long: ${duration}ms`); // Ensure fast response
});

test("cacheMiddleware isolates cache by user role and college scope", async () => {
  const app = express();
  let callCount = 0;

  // Middleware to mock user session
  app.use((req, res, next) => {
    const role = req.headers["x-role"];
    const college = req.headers["x-college"];
    if (role) {
      req.user = { role, collegeName: college };
    }
    next();
  });

  app.get("/isolated", cacheMiddleware(5), (req, res) => {
    callCount++;
    res.json({ count: callCount, role: req.user?.role, college: req.user?.collegeName });
  });

  // Student 1 from ABC college -> MISS
  const res1 = await request(app)
    .get("/isolated")
    .set("x-role", "student")
    .set("x-college", "ABC college");
  assert.equal(res1.headers["x-cache"], "MISS");
  assert.equal(res1.body.count, 1);

  // Student 1 from ABC college -> HIT
  const res2 = await request(app)
    .get("/isolated")
    .set("x-role", "student")
    .set("x-college", "ABC college");
  assert.equal(res2.headers["x-cache"], "HIT");
  assert.equal(res2.body.count, 1);

  // Student 2 from XYZ college -> MISS (due to college boundary)
  const res3 = await request(app)
    .get("/isolated")
    .set("x-role", "student")
    .set("x-college", "XYZ college");
  assert.equal(res3.headers["x-cache"], "MISS");
  assert.equal(res3.body.count, 2);

  // Admin -> MISS (due to role/no college boundary)
  const res4 = await request(app)
    .get("/isolated")
    .set("x-role", "admin");
  assert.equal(res4.headers["x-cache"], "MISS");
  assert.equal(res4.body.count, 3);
});

test("invalidateCacheMiddleware purges matching keys on successful write (2xx status)", async () => {
  const app = express();
  let getCallCount = 0;

  app.get("/data", cacheMiddleware(5), (req, res) => {
    getCallCount++;
    res.json({ val: getCallCount });
  });

  app.post("/data", invalidateCacheMiddleware("/data"), (req, res) => {
    res.status(201).json({ success: true });
  });

  app.post("/data-fail", invalidateCacheMiddleware("/data"), (req, res) => {
    res.status(400).json({ success: false });
  });

  // 1. Fetch data -> Cache MISS
  const res1 = await request(app).get("/data");
  assert.equal(res1.headers["x-cache"], "MISS");
  assert.equal(res1.body.val, 1);

  // 2. Fetch data -> Cache HIT
  const res2 = await request(app).get("/data");
  assert.equal(res2.headers["x-cache"], "HIT");
  assert.equal(res2.body.val, 1);

  // 3. Trigger failed write -> should NOT invalidate
  const resWriteFail = await request(app).post("/data-fail");
  assert.equal(resWriteFail.status, 400);

  const res3 = await request(app).get("/data");
  assert.equal(res3.headers["x-cache"], "HIT"); // still hit
  assert.equal(res3.body.val, 1);

  // 4. Trigger successful write -> should invalidate
  const resWriteSuccess = await request(app).post("/data");
  assert.equal(resWriteSuccess.status, 201);

  // 5. Fetch data -> Cache MISS (since cache was invalidated)
  const res4 = await request(app).get("/data");
  assert.equal(res4.headers["x-cache"], "MISS");
  assert.equal(res4.body.val, 2);
});
