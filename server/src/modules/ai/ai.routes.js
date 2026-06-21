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
import { createRateLimiter, RateLimitBucket, getWindowStart } from "../../middleware/rateLimit.js";
import { llmFirewall } from "../../middleware/llmFirewall.js";
import { createHttpError } from "../../utils/requestValidation.js";

export const aiRouter = Router();

async function checkAiAbuse(req, res, next) {
  try {
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const windowStart = getWindowStart(now, windowMs);
    const key = `ai_abuse:${req.user?.id || req.ip}`;

    const bucket = await RateLimitBucket.findOne({ key, windowStart });
    if (bucket && bucket.count >= 3) {
      return next(
        createHttpError(
          429,
          "You are temporarily blocked from using AI for 24 hours due to repeated irrelevant questions."
        )
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: "AI request limit reached. Please wait an hour and try again.",
  keyPrefix: "ai",
  keyGenerator: (req) => req.user?.id || req.ip
});

aiRouter.use(protect, aiRateLimiter, checkAiAbuse, llmFirewall);

aiRouter.get("/summary", summarizeLecture);
aiRouter.get("/pyq-answer", generatePyqAnswer);
aiRouter.get("/recommendations", getRecommendations);
aiRouter.get("/history", getAiHistory);
aiRouter.delete("/history", clearAiHistory);
aiRouter.delete("/history/:historyId", deleteAiHistoryItem);
aiRouter.get("/status", getAiStatus);
aiRouter.post("/ask", askAi);
