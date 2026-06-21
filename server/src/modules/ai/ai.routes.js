import { Router } from "express";
import {
  askAi,
  clearAiHistory,
  deleteAiHistoryItem,
  generatePyqAnswer,
  getAiHistory,
  getAiStatus,
  getRecommendations,
  summarizeLecture
} from "./ai.controller.js";
import { protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { llmFirewall } from "../../middleware/llmFirewall.js";

export const aiRouter = Router();

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: "AI request limit reached. Please wait an hour and try again.",
  keyPrefix: "ai",
  keyGenerator: (req) => req.user?.id || req.ip
});

aiRouter.use(protect, aiRateLimiter, llmFirewall);

aiRouter.get("/summary", summarizeLecture);
aiRouter.get("/pyq-answer", generatePyqAnswer);
aiRouter.get("/recommendations", getRecommendations);
aiRouter.get("/history", getAiHistory);
aiRouter.delete("/history", clearAiHistory);
aiRouter.delete("/history/:historyId", deleteAiHistoryItem);
aiRouter.get("/status", getAiStatus);
aiRouter.post("/ask", askAi);
