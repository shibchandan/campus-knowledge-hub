import { Router } from "express";
import { createThread, getThreads } from "./community.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const communityRouter = Router();

communityRouter.get("/", getThreads);
communityRouter.post("/", protect, createThread);
