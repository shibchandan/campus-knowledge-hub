import { Router } from "express";
import { createLecture, getLectures } from "./lecture.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";

export const lectureRouter = Router();

lectureRouter.get("/", getLectures);
lectureRouter.post("/", protect, authorize("representative", "admin"), createLecture);
