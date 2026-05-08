import { Router } from "express";
import { optionalProtect, protect } from "../../middleware/authMiddleware.js";
import { upload } from "../../middleware/uploadMiddleware.js";
import {
  deleteResource,
  downloadResource,
  getResources,
  unlockProtectedResource,
  updateResource,
  verifyProtectedResourcePayment,
  viewResourceFile,
  uploadResource
} from "./resource.controller.js";

export const resourceRouter = Router();

resourceRouter.get("/", optionalProtect, getResources);
resourceRouter.get("/:resourceId/file", optionalProtect, viewResourceFile);
resourceRouter.get("/:resourceId/download", optionalProtect, downloadResource);
resourceRouter.post("/:resourceId/unlock", protect, unlockProtectedResource);
resourceRouter.post("/:resourceId/verify-unlock-payment", protect, verifyProtectedResourcePayment);
resourceRouter.patch("/:resourceId", protect, updateResource);
resourceRouter.delete("/:resourceId", protect, deleteResource);
resourceRouter.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadResource
);
