import cors from "cors";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
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

  // Prevent browser requests for favicon and robots from polluting 404 error logs
  app.get("/favicon.ico", (req, res) => res.status(204).end());
  app.get("/robots.txt", (req, res) => res.type("text/plain").send("User-agent: *\nDisallow: /"));

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
  app.use(compression());
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
    maxRequests: 200,
    message: "Global rate limit exceeded. Please try again later.",
    keyPrefix: "global"
  });

  // Tighter limiter applied only to sensitive auth endpoints
  const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 30,
    message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
    keyPrefix: "auth"
  });

  app.use("/api", globalRateLimiter, apiRouter);
  app.use("/api/auth/login", authRateLimiter);
  app.use("/api/auth/register", authRateLimiter);
  app.use("/api/auth/forgot-password", authRateLimiter);


  if (env.serveFrontend) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientDistPath = path.resolve(__dirname, "../../client/dist");

    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
