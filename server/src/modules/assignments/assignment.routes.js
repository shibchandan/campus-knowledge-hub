import { Router } from "express";
import { 
  createAssignment, 
  getAssignments, 
  getAssignmentById, 
  replyToAssignment, 
  deleteAssignment,
  downloadAssignmentAsPdf,
  uploadAssignmentFile
} from "./assignment.controller.js";
import { protect } from "../../middleware/authMiddleware.js";
import { upload, validateUploadedFile } from "../../middleware/uploadMiddleware.js";

export const assignmentRouter = Router();

assignmentRouter.get("/", protect, getAssignments);
assignmentRouter.post("/", protect, createAssignment);
assignmentRouter.post("/upload", protect, upload.single("file"), validateUploadedFile, uploadAssignmentFile);
assignmentRouter.get("/:id", protect, getAssignmentById);
assignmentRouter.get("/:id/download", protect, downloadAssignmentAsPdf);
assignmentRouter.post("/:id/reply", protect, replyToAssignment);
assignmentRouter.delete("/:id", protect, deleteAssignment);
