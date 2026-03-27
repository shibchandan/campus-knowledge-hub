import mongoose from "mongoose";

const aiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    provider: { type: String, default: "" },
    question: { type: String, required: true, trim: true },
    intent: { type: String, default: "general", trim: true },
    answer: { type: Object, required: true },
    collegeName: { type: String, default: "", trim: true },
    filters: {
      programId: { type: String, default: "", trim: true },
      branchId: { type: String, default: "", trim: true },
      semesterId: { type: String, default: "", trim: true },
      subjectId: { type: String, default: "", trim: true },
      categoryId: { type: String, default: "", trim: true }
    },
    sourceResources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource"
      }
    ],
    usedFallback: { type: Boolean, default: false }
  },
  { timestamps: true }
);

aiHistorySchema.index({ user: 1, createdAt: -1 }, { name: "idx_ai_history_user_created" });

export const AiHistory = mongoose.model("AiHistory", aiHistorySchema);
