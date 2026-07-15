import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    collegeName: {
      type: String,
      trim: true,
      default: ""
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info"
    },
    isRead: {
      type: Boolean,
      default: false
    },
    link: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
