import { Router } from "express";
import {
  adminCreateUser,
  adminUpdateUser,
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  listUsers,
  register,
  resetPassword,
  updateProfile
} from "./auth.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please try again later.",
  keyPrefix: "auth"
});

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/forgot-password", authRateLimiter, forgotPassword);
authRouter.post("/reset-password", authRateLimiter, resetPassword);
authRouter.get("/me", protect, getCurrentUser);
authRouter.patch("/me", protect, updateProfile);
authRouter.post("/change-password", protect, authRateLimiter, changePassword);
authRouter.get("/admin/users", protect, authorize("admin"), listUsers);
authRouter.post("/admin/users", protect, authorize("admin"), adminCreateUser);
authRouter.patch("/admin/users/:userId", protect, authorize("admin"), adminUpdateUser);
