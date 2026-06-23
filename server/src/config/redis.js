import { createClient } from "redis";
import { env } from "./env.js";

let redisClient = null;

if (env.redisUrl) {
  redisClient = createClient({
    url: env.redisUrl
  });

  redisClient.on("error", (err) => {
    console.warn("[REDIS] Redis client error:", err.message);
  });

  redisClient.on("connect", () => {
    console.log("[REDIS] Connected to Redis successfully.");
  });

  // Connect automatically without blocking
  redisClient.connect().catch(err => {
    console.warn("[REDIS] Failed to connect on startup:", err.message);
  });
}

export { redisClient };
