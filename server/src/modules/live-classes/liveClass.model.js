import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    meetingUrl: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collegeName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export const LiveClass = mongoose.model("LiveClass", liveClassSchema);
