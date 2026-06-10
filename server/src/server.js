import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import http from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { assertDeploymentBootable } from "./config/deployment.js";
import { env } from "./config/env.js";
import { logAppEvent } from "./services/logger.service.js";

export function configureHttpServer(server, config = env) {
  server.requestTimeout = config.serverRequestTimeoutMs;
  server.headersTimeout = config.serverHeadersTimeoutMs;
  server.keepAliveTimeout = config.serverKeepAliveTimeoutMs;

  return server;
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function createGracefulShutdown({
  server,
  closeDatabase = disconnectDatabase,
  logger = logAppEvent,
  shutdownGraceMs = env.serverShutdownGraceMs,
  exit = (code) => process.exit(code)
}) {
  let shuttingDownPromise = null;
  const sockets = new Set();

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  return async function gracefulShutdown(signal = "shutdown") {
    if (shuttingDownPromise) {
      return shuttingDownPromise;
    }

    shuttingDownPromise = (async () => {
      logger("info", "server_shutdown_started", { signal });

      const forceCloseTimer = setTimeout(() => {
        for (const socket of sockets) {
          socket.destroy();
        }
      }, shutdownGraceMs);

      if (typeof forceCloseTimer.unref === "function") {
        forceCloseTimer.unref();
      }

      try {
        if (typeof server.closeIdleConnections === "function") {
          server.closeIdleConnections();
        }

        await closeServer(server);
        await closeDatabase();
        logger("info", "server_shutdown_completed", { signal });
        exit(0);
      } catch (error) {
        logger("error", "server_shutdown_failed", {
          signal,
          error: error.message
        });
        exit(1);
      } finally {
        clearTimeout(forceCloseTimer);
      }
    })();

    return shuttingDownPromise;
  };
}

export function registerProcessHandlers(gracefulShutdown, proc = process) {
  const handleSigint = () => gracefulShutdown("SIGINT");
  const handleSigterm = () => gracefulShutdown("SIGTERM");

  proc.once("SIGINT", handleSigint);
  proc.once("SIGTERM", handleSigterm);
}

export async function bootstrap(config = env) {
  const deploymentStatus = assertDeploymentBootable(config);
  for (const warning of deploymentStatus.warnings) {
    logAppEvent("warn", "deployment_configuration_warning", warning);
  }

  await connectDatabase();
  const app = createApp();
  const server = configureHttpServer(http.createServer(app), config);
  const gracefulShutdown = createGracefulShutdown({
    server,
    shutdownGraceMs: config.serverShutdownGraceMs
  });

  registerProcessHandlers(gracefulShutdown);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, () => {
      server.off("error", reject);
      console.log(`Server running on port ${config.port}`);
      logAppEvent("info", "server_started", {
        port: config.port,
        instanceId: config.instanceId,
        multiInstanceEnabled: config.multiInstanceEnabled,
        sharedStorageConfigured: deploymentStatus.sharedStorageConfigured
      });
      resolve();
    });
  });

  return { app, server, gracefulShutdown };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  bootstrap().catch((error) => {
    console.error("Failed to start server", error);
    logAppEvent("error", "server_start_failed", { error: error.message });
    process.exit(1);
  });
}
