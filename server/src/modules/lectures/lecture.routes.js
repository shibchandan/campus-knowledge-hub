import { Router } from "express";
import { createLecture, getLectures } from "./lecture.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";

export const lectureRouter = Router();

lectureRouter.get("/", cacheMiddleware(60), getLectures);
lectureRouter.post("/", protect, authorize("representative", "admin"), invalidateCacheMiddleware("/api/lectures"), createLecture);
