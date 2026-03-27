import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    collegeName: { type: String, default: "", trim: true },
    collegeNameNormalized: { type: String, default: "", trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    isPublished: { type: Boolean, default: true },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

noticeSchema.index(
  { isPublished: 1, createdAt: -1 },
  { name: "idx_notice_published_created" }
);
noticeSchema.index(
  { collegeNameNormalized: 1, isPublished: 1, createdAt: -1 },
  { name: "idx_notice_college_published_created" }
);

export const Notice = mongoose.model("Notice", noticeSchema);
