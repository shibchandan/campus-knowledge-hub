import { Router } from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  addBlockedUser,
  getMySettings,
  removeBlockedUser,
  updateMyPreferences
} from "./settings.controller.js";

export const settingsRouter = Router();

settingsRouter.get("/me", protect, getMySettings);
settingsRouter.patch("/preferences", protect, updateMyPreferences);
settingsRouter.post("/blocked-users", protect, addBlockedUser);
settingsRouter.delete("/blocked-users/:blockedUserId", protect, removeBlockedUser);
