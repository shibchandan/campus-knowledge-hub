import { Router } from "express";
import { authorize, optionalProtect, protect } from "../../middleware/authMiddleware.js";
import { upload } from "../../middleware/uploadMiddleware.js";
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

resourceRouter.get("/", optionalProtect, getResources);
resourceRouter.get("/reports", protect, authorize("representative"), getCollegeResourceReports);
resourceRouter.patch("/reports/:reportId/dismiss", protect, authorize("representative"), dismissResourceReport);
resourceRouter.get("/category-counts", optionalProtect, getCategoryCounts);
resourceRouter.get("/:resourceId/file", optionalProtect, viewResourceFile);
resourceRouter.get("/:resourceId/download", optionalProtect, downloadResource);
resourceRouter.post("/:resourceId/unlock", protect, unlockProtectedResource);
resourceRouter.post("/:resourceId/verify-unlock-payment", protect, verifyProtectedResourcePayment);
resourceRouter.patch("/:resourceId", protect, updateResource);
resourceRouter.delete("/:resourceId", protect, deleteResource);
resourceRouter.post("/:resourceId/report", protect, reportResource);
resourceRouter.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadResource
);
