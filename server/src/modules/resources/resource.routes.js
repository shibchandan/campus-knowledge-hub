import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { upload } from "../../middleware/uploadMiddleware.js";
import {
  deleteResource,
  downloadResource,
  getResources,
  updateResource,
  uploadResource
} from "./resource.controller.js";

export const resourceRouter = Router();

resourceRouter.get("/", protect, getResources);
resourceRouter.get("/:resourceId/download", protect, downloadResource);
resourceRouter.patch("/:resourceId", protect, updateResource);
resourceRouter.delete("/:resourceId", protect, deleteResource);
resourceRouter.post(
  "/upload",
  protect,
  authorize("representative", "admin"),
  upload.single("file"),
  uploadResource
);
