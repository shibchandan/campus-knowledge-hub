import { Router } from "express";
import {
  createLiveClass,
  getLiveClasses,
  updateLiveClass,
  deleteLiveClass,
} from "./liveClass.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";

export const liveClassRouter = Router();

liveClassRouter.get("/", cacheMiddleware(30), getLiveClasses);

liveClassRouter.post(
  "/",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/api/live-classes"),
  createLiveClass
);

liveClassRouter.patch(
  "/:id",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/api/live-classes"),
  updateLiveClass
);

liveClassRouter.delete(
  "/:id",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/api/live-classes"),
  deleteLiveClass
);
