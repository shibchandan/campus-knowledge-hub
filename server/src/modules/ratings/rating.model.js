import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["resource", "lecture", "note", "marketplace-item"],
      required: true
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stars: { type: Number, min: 0, max: 5, default: 0 },
    vote: { type: String, enum: ["upvote", "downvote", "neutral"], default: "neutral" },
    originalityScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ratingSchema.index({ resourceType: 1, resourceId: 1, user: 1 }, { unique: true });
ratingSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const Rating = mongoose.model("Rating", ratingSchema);
