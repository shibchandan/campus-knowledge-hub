import { Router } from "express";
import { createThread, getThreads, getThreadById, replyToThread, deleteThread } from "./community.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const communityRouter = Router();

communityRouter.get("/", getThreads);
communityRouter.post("/", protect, createThread);
communityRouter.get("/:id", protect, getThreadById);
communityRouter.post("/:id/reply", protect, replyToThread);
communityRouter.delete("/:id", protect, deleteThread);
