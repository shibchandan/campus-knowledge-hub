import { Router } from "express";
import { 
  createAssignment, 
  getAssignments, 
  getAssignmentById, 
  replyToAssignment, 
  deleteAssignment,
  downloadAssignmentAsPdf
} from "./assignment.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const assignmentRouter = Router();

assignmentRouter.get("/", protect, getAssignments);
assignmentRouter.post("/", protect, createAssignment);
assignmentRouter.get("/:id", protect, getAssignmentById);
assignmentRouter.get("/:id/download", protect, downloadAssignmentAsPdf);
assignmentRouter.post("/:id/reply", protect, replyToAssignment);
assignmentRouter.delete("/:id", protect, deleteAssignment);
