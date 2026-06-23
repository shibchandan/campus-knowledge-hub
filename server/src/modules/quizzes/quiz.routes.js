import { Router } from "express";
import { authorize, protect, optionalProtect } from "../../middleware/authMiddleware.js";
import {
  createQuiz,
  deleteQuiz,
  getQuizById,
  listQuizzes,
  updateQuiz,
  startQuiz,
  endQuiz,
  submitQuiz,
  getQuizResults
} from "./quiz.controller.js";

export const quizRouter = Router();

quizRouter.get("/", optionalProtect, listQuizzes);
quizRouter.get("/:quizId", protect, getQuizById);
quizRouter.get("/:quizId/results", protect, authorize("representative", "admin"), getQuizResults);
quizRouter.post("/:quizId/start", protect, startQuiz);
quizRouter.post("/:quizId/submit", protect, submitQuiz);
quizRouter.post("/:quizId/end", protect, authorize("representative", "admin"), endQuiz);
quizRouter.post("/", protect, authorize("representative", "admin"), createQuiz);
quizRouter.patch("/:quizId", protect, authorize("representative", "admin"), updateQuiz);
quizRouter.delete("/:quizId", protect, authorize("representative", "admin"), deleteQuiz);
