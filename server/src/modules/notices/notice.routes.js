import { Router } from "express";
import { authorize, optionalProtect, protect } from "../../middleware/authMiddleware.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";
import {
  createNotice,
  deleteNotice,
  listNotices,
  updateNotice
} from "./notice.controller.js";

export const noticeRouter = Router();

noticeRouter.get("/", optionalProtect, cacheMiddleware(60), listNotices);
noticeRouter.post("/", protect, authorize("representative", "admin"), invalidateCacheMiddleware("/api/notices"), createNotice);
noticeRouter.patch("/:noticeId", protect, authorize("representative", "admin"), invalidateCacheMiddleware("/api/notices"), updateNotice);
noticeRouter.delete("/:noticeId", protect, authorize("representative", "admin"), invalidateCacheMiddleware("/api/notices"), deleteNotice);
