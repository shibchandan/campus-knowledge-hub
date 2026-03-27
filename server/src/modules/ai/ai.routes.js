import { Router } from "express";
import {
  askAi,
  generatePyqAnswer,
  getAiHistory,
  getAiStatus,
  getRecommendations,
  summarizeLecture
} from "./ai.controller.js";
import { protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";

export const aiRouter = Router();

const aiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: "AI request limit reached. Please wait a few minutes and try again.",
  keyPrefix: "ai"
});

aiRouter.use(protect, aiRateLimiter);

aiRouter.get("/summary", summarizeLecture);
aiRouter.get("/pyq-answer", generatePyqAnswer);
aiRouter.get("/recommendations", getRecommendations);
aiRouter.get("/history", getAiHistory);
aiRouter.get("/status", getAiStatus);
aiRouter.post("/ask", askAi);
