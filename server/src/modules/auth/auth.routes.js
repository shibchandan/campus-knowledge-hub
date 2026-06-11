import { Router } from "express";
import {
  adminCreateUser,
  adminUpdateUser,
  changePassword,
  downloadStudentProof,
  forgotPassword,
  getCurrentUser,
  login,
  listUsers,
  register,
  resetPassword,
  submitStudentVerification,
  sendCollegeEmailOtp,
  updateProfile,
  verifyCollegeEmailOtp,
  testSmtp,
  setup2fa,
  verifyAndEnable2fa,
  disable2fa,
  login2fa,
  contactAdmin
} from "./auth.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { upload } from "../../middleware/uploadMiddleware.js";

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please try again later.",
  keyPrefix: "auth"
});

authRouter.post("/register", authRateLimiter, upload.single("studentProof"), register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/forgot-password", authRateLimiter, forgotPassword);
authRouter.post("/reset-password", authRateLimiter, resetPassword);
authRouter.get("/me", protect, getCurrentUser);
authRouter.patch("/me", protect, updateProfile);
authRouter.post("/change-password", protect, authRateLimiter, changePassword);
authRouter.post(
  "/student-verification/submit",
  protect,
  authRateLimiter,
  upload.single("studentProof"),
  submitStudentVerification
);
authRouter.post("/student-verification/send-college-email-otp", protect, authRateLimiter, sendCollegeEmailOtp);
authRouter.post("/student-verification/verify-college-email-otp", protect, authRateLimiter, verifyCollegeEmailOtp);
authRouter.get("/student-proof/:userId", protect, downloadStudentProof);
authRouter.get("/admin/users", protect, authorize("admin"), listUsers);
authRouter.post("/admin/users", protect, authorize("admin"), adminCreateUser);
authRouter.patch("/admin/users/:userId", protect, authorize("admin"), adminUpdateUser);
authRouter.get("/test-smtp", testSmtp);

// 2FA & Contact routes
authRouter.post("/2fa/setup", protect, setup2fa);
authRouter.post("/2fa/verify", protect, verifyAndEnable2fa);
authRouter.post("/2fa/disable", protect, disable2fa);
authRouter.post("/2fa/login-verify", authRateLimiter, login2fa);
authRouter.post("/contact-admin", contactAdmin);

