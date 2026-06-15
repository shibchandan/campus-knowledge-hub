import mongoose from "mongoose";

const communityGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    inviteCode: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College" }, // Optional binding to a college
    maxCapacity: { type: Number, default: 256 },
    onlyAdminsCanMessage: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { _id: false }
);

const communityMessageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunityGroup", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    reactions: [reactionSchema]
  },
  { timestamps: true }
);

export const CommunityGroup = mongoose.model("CommunityGroup", communityGroupSchema);
export const CommunityMessage = mongoose.model("CommunityMessage", communityMessageSchema);
