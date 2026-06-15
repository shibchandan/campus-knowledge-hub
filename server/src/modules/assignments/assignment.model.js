import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    collegeNameNormalized: { type: String, required: true, index: true },
    isGlobal: { type: Boolean, default: false, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    replies: [replySchema],
    // The magical TTL index: deletes document automatically 6 hours (21600 seconds) after creation
    createdAt: { type: Date, default: Date.now, expires: 21600 }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
