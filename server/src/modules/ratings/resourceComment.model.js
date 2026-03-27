import mongoose from "mongoose";

const resourceCommentSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["resource", "lecture", "note", "marketplace-item"],
      required: true
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

resourceCommentSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
resourceCommentSchema.index({ user: 1, createdAt: -1 });

export const ResourceComment = mongoose.model("ResourceComment", resourceCommentSchema);
