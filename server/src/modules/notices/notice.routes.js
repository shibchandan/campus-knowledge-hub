import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import {
  createNotice,
  deleteNotice,
  listNotices,
  updateNotice
} from "./notice.controller.js";

export const noticeRouter = Router();

noticeRouter.get("/", protect, listNotices);
noticeRouter.post("/", protect, authorize("admin"), createNotice);
noticeRouter.patch("/:noticeId", protect, authorize("admin"), updateNotice);
noticeRouter.delete("/:noticeId", protect, authorize("admin"), deleteNotice);
