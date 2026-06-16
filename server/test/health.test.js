import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

test("GET / returns API info", async () => {
  const app = createApp();
  const response = await request(app).get("/").set("User-Agent", "test-agent").set("Origin", "http://localhost:5173");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Campus Knowledge Hub API");
  assert.ok(response.headers["x-instance-id"]);
});

test("GET /health returns healthy status", async () => {
  const app = createApp();
  const response = await request(app).get("/health").set("User-Agent", "test-agent").set("Origin", "http://localhost:5173");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.instanceId);
});

test("GET /ready returns not ready status when database is disconnected", async () => {
  const app = createApp();
  const response = await request(app).get("/ready").set("User-Agent", "test-agent").set("Origin", "http://localhost:5173");

  assert.equal(response.status, 503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data.databaseStatus, "disconnected");
  assert.equal(
    response.body.data.issues.some((issue) => issue.code === "database_not_ready"),
    true
  );
});
