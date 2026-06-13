import mongoose from "mongoose";

const resourceReportSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    collegeNameNormalized: {
      type: String,
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: true,
      enum: ["copyright", "spam", "inappropriate", "quality_issue", "wrong_content", "other"]
    },
    description: {
      type: String,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

export const ResourceReport = mongoose.model("ResourceReport", resourceReportSchema);
