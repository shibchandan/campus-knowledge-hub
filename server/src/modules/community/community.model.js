import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const communityThreadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    replies: [replySchema],
    channelType: { type: String, enum: ["forum", "chat", "mentorship"], default: "forum" }
  },
  { timestamps: true }
);

export const CommunityThread = mongoose.model("CommunityThread", communityThreadSchema);
