import { Router } from "express";
import { 
  createAssignment, 
  getAssignments, 
  getAssignmentById, 
  replyToAssignment, 
  deleteAssignment 
} from "./assignment.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const assignmentRouter = Router();

assignmentRouter.get("/", protect, getAssignments);
assignmentRouter.post("/", protect, createAssignment);
assignmentRouter.get("/:id", protect, getAssignmentById);
assignmentRouter.post("/:id/reply", protect, replyToAssignment);
assignmentRouter.delete("/:id", protect, deleteAssignment);
