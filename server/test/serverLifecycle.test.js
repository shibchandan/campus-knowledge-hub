import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { configureHttpServer, createGracefulShutdown } from "../src/server.js";

test("configureHttpServer applies request, headers, and keep-alive timeouts", () => {
  const server = {};

  configureHttpServer(server, {
    serverRequestTimeoutMs: 15000,
    serverHeadersTimeoutMs: 16000,
    serverKeepAliveTimeoutMs: 4000
  });

  assert.equal(server.requestTimeout, 15000);
  assert.equal(server.headersTimeout, 16000);
  assert.equal(server.keepAliveTimeout, 4000);
});

test("graceful shutdown closes idle connections, disconnects database, and exits cleanly", async () => {
  const server = new EventEmitter();
  const socket = new EventEmitter();
  let closeCalled = false;
  let closeIdleConnectionsCalled = false;
  let disconnectCalled = false;
  let exitCode = null;
  const events = [];

  socket.destroy = () => {
    socket.emit("close");
  };

  server.closeIdleConnections = () => {
    closeIdleConnectionsCalled = true;
  };

  server.close = (callback) => {
    closeCalled = true;
    callback(null);
  };

  const gracefulShutdown = createGracefulShutdown({
    server,
    closeDatabase: async () => {
      disconnectCalled = true;
    },
    logger: (level, message, metadata) => {
      events.push({ level, message, metadata });
    },
    shutdownGraceMs: 25,
    exit: (code) => {
      exitCode = code;
    }
  });

  server.emit("connection", socket);
  await gracefulShutdown("SIGTERM");

  assert.equal(closeIdleConnectionsCalled, true);
  assert.equal(closeCalled, true);
  assert.equal(disconnectCalled, true);
  assert.equal(exitCode, 0);
  assert.deepEqual(
    events.map((event) => event.message),
    ["server_shutdown_started", "server_shutdown_completed"]
  );
});

test("graceful shutdown exits with failure when server close fails", async () => {
  const server = new EventEmitter();
  let exitCode = null;
  const events = [];

  server.close = (callback) => {
    callback(new Error("close failed"));
  };

  const gracefulShutdown = createGracefulShutdown({
    server,
    closeDatabase: async () => {},
    logger: (level, message, metadata) => {
      events.push({ level, message, metadata });
    },
    shutdownGraceMs: 25,
    exit: (code) => {
      exitCode = code;
    }
  });

  await gracefulShutdown("SIGINT");

  assert.equal(exitCode, 1);
  assert.deepEqual(
    events.map((event) => event.message),
    ["server_shutdown_started", "server_shutdown_failed"]
  );
});
