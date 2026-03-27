import { Router } from "express";
import {
  addComment,
  createRating,
  deleteComment,
  getRatings,
  getRatingSummary
} from "./rating.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const ratingRouter = Router();

ratingRouter.get("/", protect, getRatings);
ratingRouter.get("/summary", protect, getRatingSummary);
ratingRouter.post("/", protect, createRating);
ratingRouter.post("/comments", protect, addComment);
ratingRouter.delete("/comments/:commentId", protect, deleteComment);
