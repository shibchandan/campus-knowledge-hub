import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { abuseProtection } from "./middleware/abuseProtection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { sanitizeRequest } from "./middleware/sanitizeRequest.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { apiRouter } from "./routes/index.js";
import { requestLogStream } from "./services/logger.service.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.trustProxy);

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true
    })
  );
  app.use(securityHeaders);
  app.use(morgan("combined", { stream: requestLogStream }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(abuseProtection);
  app.use(sanitizeRequest);

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
    res.json({ success: true, message: "Campus Knowledge Hub API is healthy" });
  });

  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
