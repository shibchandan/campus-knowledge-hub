import { Router } from "express";
import { authorize, optionalProtect, protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";
import { upload, validateUploadedFile } from "../../middleware/uploadMiddleware.js";
import {
  deleteResource,
  downloadResource,
  getCategoryCounts,
  getResources,
  unlockProtectedResource,
  updateResource,
  verifyProtectedResourcePayment,
  viewResourceFile,
  uploadResource,
  reportResource,
  getCollegeResourceReports,
  dismissResourceReport
} from "./resource.controller.js";

export const resourceRouter = Router();

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: "Too many file upload requests. Please wait a minute.",
  keyPrefix: "upload"
});

resourceRouter.get("/", optionalProtect, cacheMiddleware(60), getResources);
resourceRouter.get("/reports", protect, authorize("representative"), getCollegeResourceReports);
resourceRouter.patch("/reports/:reportId/dismiss", protect, authorize("representative"), dismissResourceReport);
resourceRouter.get("/category-counts", optionalProtect, cacheMiddleware(300), getCategoryCounts);
resourceRouter.get("/:resourceId/file", optionalProtect, viewResourceFile);
resourceRouter.get("/:resourceId/download", optionalProtect, downloadResource);
resourceRouter.post("/:resourceId/unlock", protect, unlockProtectedResource);
resourceRouter.post("/:resourceId/verify-unlock-payment", protect, verifyProtectedResourcePayment);
resourceRouter.patch("/:resourceId", protect, invalidateCacheMiddleware("/api/resources"), updateResource);
resourceRouter.delete("/:resourceId", protect, invalidateCacheMiddleware("/api/resources"), deleteResource);
resourceRouter.post("/:resourceId/report", protect, reportResource);
resourceRouter.post(
  "/upload",
  protect,
  uploadRateLimiter,
  invalidateCacheMiddleware("/api/resources"),
  upload.single("file"),
  validateUploadedFile,
  uploadResource
);
