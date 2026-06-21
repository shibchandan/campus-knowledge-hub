import cors from "cors";
import "./config/mongooseGlobalPlugin.js";
import express from "express";
import morgan from "morgan";
import { getDeploymentReadiness } from "./config/deployment.js";
import { env } from "./config/env.js";
import { abuseProtection } from "./middleware/abuseProtection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { sanitizeRequest } from "./middleware/sanitizeRequest.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { csrfMiddleware } from "./middleware/csrfMiddleware.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";
import { requestLogStream } from "./services/logger.service.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        const cleanOrigin = origin.replace(/\/$/, "").toLowerCase();
        const cleanClient = env.clientUrl.replace(/\/$/, "").toLowerCase();

        const matchDirect = cleanOrigin === cleanClient;
        const matchNoProtocol =
          cleanOrigin.replace(/^https?:\/\//, "") === cleanClient.replace(/^https?:\/\//, "");

        if (matchDirect || matchNoProtocol) {
          callback(null, true);
        } else {
          callback(null, false); // Reject unauthorized origins safely
        }
      },
      credentials: true
    })
  );
  app.use((req, res, next) => {
    res.set("X-Instance-Id", env.instanceId);
    next();
  });
  app.use(securityHeaders);
  app.use(morgan("combined", { stream: requestLogStream }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(abuseProtection);
  app.use(sanitizeRequest);
  app.use(csrfMiddleware);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "Campus Knowledge Hub API",
      docs: {
        health: "/health",
        apiBase: "/api"
      }
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      message: "Campus Knowledge Hub API is healthy",
      instanceId: env.instanceId
    });
  });

  app.get("/ready", (_req, res) => {
    const readiness = getDeploymentReadiness();

    res.status(readiness.ok ? 200 : 503).json({
      success: readiness.ok,
      message: readiness.ok
        ? "Campus Knowledge Hub API is ready"
        : "Campus Knowledge Hub API is not ready",
      data: readiness
    });
  });

  const globalRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: "Global rate limit exceeded. Please try again later.",
    keyPrefix: "global"
  });

  app.use("/api", globalRateLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
