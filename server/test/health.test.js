import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

test("GET / returns API info", async () => {
  const app = createApp();
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Campus Knowledge Hub API");
});

test("GET /health returns healthy status", async () => {
  const app = createApp();
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});
