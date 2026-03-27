import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    sourceType: { type: String, enum: ["internal", "public"], required: true },
    sourceLabel: { type: String, required: true },
    similarityPercentage: { type: Number, required: true }
  },
  { _id: false }
);

const plagiarismSchema = new mongoose.Schema(
  {
    resourceType: { type: String, enum: ["lecture", "note", "pyq", "solution"], required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contributor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    overallSimilarity: { type: Number, required: true },
    matches: [matchSchema],
    status: { type: String, enum: ["clear", "warning", "review"], default: "clear" }
  },
  { timestamps: true }
);

export const PlagiarismRecord = mongoose.model("PlagiarismRecord", plagiarismSchema);
