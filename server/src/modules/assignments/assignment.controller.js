import { Assignment } from "./assignment.model.js";
import { normalizeCollegeName } from "../../utils/requestValidation.js";

export async function createAssignment(req, res, next) {
  try {
    const userCollege = normalizeCollegeName(req.user.collegeName);
    if (!userCollege && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You must be associated with a college to post an assignment." });
    }

    const assignment = await Assignment.create({
      ...req.body,
      collegeNameNormalized: userCollege || "admin_global",
      author: req.user.id
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}

export async function getAssignments(req, res, next) {
  try {
    const filters = {};
    
    // Only admins can see global, otherwise restrict to the user's college
    if (req.user.role !== "admin") {
      filters.collegeNameNormalized = normalizeCollegeName(req.user.collegeName);
    } else if (req.query.collegeName) {
      filters.collegeNameNormalized = normalizeCollegeName(req.query.collegeName);
    }

    const assignments = await Assignment.find(filters)
      .populate("author", "fullName email role")
      .sort("-createdAt");
      
    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentById(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("author", "fullName email role")
      .populate("replies.author", "fullName email role");

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found or has expired." });
    }

    if (req.user.role !== "admin" && assignment.collegeNameNormalized !== normalizeCollegeName(req.user.collegeName)) {
      return res.status(403).json({ success: false, message: "You do not have permission to view this assignment." });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}

export async function replyToAssignment(req, res, next) {
  try {
    const { message, attachmentUrl, attachmentName } = req.body;
    if (!message && !attachmentUrl) {
      return res.status(400).json({ success: false, message: "A message or an attachment is required." });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found or has expired." });
    }

    if (req.user.role !== "admin" && assignment.collegeNameNormalized !== normalizeCollegeName(req.user.collegeName)) {
      return res.status(403).json({ success: false, message: "You do not have permission to reply to this assignment." });
    }

    assignment.replies.push({
      message,
      attachmentUrl,
      attachmentName,
      author: req.user.id,
      createdAt: new Date()
    });

    await assignment.save();
    res.status(201).json({ success: true, message: "Reply posted successfully." });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    if (assignment.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this assignment." });
    }

    await assignment.deleteOne();
    res.json({ success: true, message: "Assignment deleted successfully." });
  } catch (error) {
    next(error);
  }
}
