import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import {
  createQuiz,
  deleteQuiz,
  getQuizById,
  listQuizzes,
  updateQuiz
} from "./quiz.controller.js";

export const quizRouter = Router();

quizRouter.get("/", listQuizzes);
quizRouter.get("/:quizId", protect, getQuizById);
quizRouter.post("/", protect, authorize("representative", "admin"), createQuiz);
quizRouter.patch("/:quizId", protect, authorize("representative", "admin"), updateQuiz);
quizRouter.delete("/:quizId", protect, authorize("representative", "admin"), deleteQuiz);
