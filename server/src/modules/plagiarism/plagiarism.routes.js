import { Router } from "express";
import { createPlagiarismRecord, getPlagiarismRecords } from "./plagiarism.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";

export const plagiarismRouter = Router();

plagiarismRouter.get("/", protect, authorize("admin", "representative"), getPlagiarismRecords);
plagiarismRouter.post("/", protect, authorize("admin", "representative"), createPlagiarismRecord);
