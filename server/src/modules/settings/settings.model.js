import mongoose from "mongoose";

const blockedUserSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    reason: { type: String, default: "", trim: true },
    blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    blockedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const settingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    notificationPreferences: {
      emailAnnouncements: { type: Boolean, default: true },
      noticeAlerts: { type: Boolean, default: true },
      quizReminders: { type: Boolean, default: true },
      aiHistoryVisible: { type: Boolean, default: true },
      darkModePreferred: { type: Boolean, default: true }
    },
    blockedUsers: [blockedUserSchema]
  },
  { timestamps: true }
);

settingsSchema.index({ user: 1 }, { unique: true, name: "uniq_settings_user" });

export const UserSettings = mongoose.model("UserSettings", settingsSchema);
