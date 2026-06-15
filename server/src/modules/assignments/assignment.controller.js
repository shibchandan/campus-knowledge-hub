import { Assignment } from "./assignment.model.js";
import { normalizeCollegeName } from "../../utils/requestValidation.js";
import { User } from "../auth/auth.model.js";
import PDFDocument from "pdfkit";

export async function createAssignment(req, res, next) {
  try {
    const userCollege = normalizeCollegeName(req.user.collegeName);
    if (!userCollege && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You must be associated with a college to post an assignment." });
    }

    const user = await User.findById(req.user.id);
    const isSubscribed = user.premiumUntil && user.premiumUntil > new Date();

    if (req.body.isGlobal && !isSubscribed && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Premium subscription required to post globally." });
    }

    const assignment = await Assignment.create({
      ...req.body,
      collegeNameNormalized: userCollege || "admin_global",
      isGlobal: req.body.isGlobal ? true : false,
      author: req.user.id
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}

export async function getAssignments(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const isSubscribed = user.premiumUntil && user.premiumUntil > new Date();

    const filters = {};
    
    if (req.user.role !== "admin") {
      const userCollege = normalizeCollegeName(req.user.collegeName);
      if (isSubscribed) {
        filters.$or = [
          { collegeNameNormalized: userCollege },
          { isGlobal: true }
        ];
      } else {
        filters.collegeNameNormalized = userCollege;
        filters.isGlobal = false;
      }
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

    const user = await User.findById(req.user.id);
    const isSubscribed = user.premiumUntil && user.premiumUntil > new Date();
    
    if (req.user.role !== "admin") {
      const isLocal = assignment.collegeNameNormalized === normalizeCollegeName(req.user.collegeName);
      const isGlobalAccess = assignment.isGlobal && isSubscribed;
      if (!isLocal && !isGlobalAccess) {
        return res.status(403).json({ success: false, message: "You do not have permission to view this assignment." });
      }
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

    const user = await User.findById(req.user.id);
    const isSubscribed = user.premiumUntil && user.premiumUntil > new Date();

    if (req.user.role !== "admin") {
      const isLocal = assignment.collegeNameNormalized === normalizeCollegeName(req.user.collegeName);
      const isGlobalAccess = assignment.isGlobal && isSubscribed;
      if (!isLocal && !isGlobalAccess) {
        return res.status(403).json({ success: false, message: "You do not have permission to reply to this assignment." });
      }
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

export async function downloadAssignmentAsPdf(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("author", "fullName")
      .populate("replies.author", "fullName");

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    // Check Premium Access
    const user = await User.findById(req.user.id);
    const isSubscribed = user.premiumUntil && user.premiumUntil > new Date();
    const hasUnlocked = user.unlockedAssignments?.includes(assignment._id);
    
    if (user.role !== "admin" && !isSubscribed && !hasUnlocked) {
      return res.status(403).json({ success: false, message: "Premium access required." });
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Assignment_${assignment._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text(assignment.title, { underline: true });
    doc.fontSize(12).fillColor("gray").text(`Author: ${assignment.author?.fullName || "Unknown"} | Subject: ${assignment.subject}`);
    doc.moveDown();
    
    doc.fontSize(14).fillColor("black").text("Question:", { underline: true });
    doc.fontSize(12).text(assignment.message);
    if (assignment.attachmentUrl) {
      doc.moveDown().fillColor("blue").text(`Attachment Link: ${assignment.attachmentUrl}`, { link: assignment.attachmentUrl });
    }
    
    doc.moveDown(2);
    doc.fontSize(16).fillColor("black").text("Replies:", { underline: true });
    doc.moveDown();

    assignment.replies.forEach((reply, idx) => {
      doc.fontSize(12).fillColor("gray").text(`#${idx + 1} from ${reply.author?.fullName || "Unknown"} at ${new Date(reply.createdAt).toLocaleString()}`);
      doc.fontSize(12).fillColor("black").text(reply.message);
      if (reply.attachmentUrl) {
        doc.fillColor("blue").text(`Solution Attachment: ${reply.attachmentUrl}`, { link: reply.attachmentUrl });
      }
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    next(error);
  }
}
