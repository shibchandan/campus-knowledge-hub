import { Router } from "express";
import {
  adminCreateUser,
  adminUpdateUser,
  changePassword,
  downloadStudentProof,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refresh,
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
  contactAdmin,
  verifyRegistrationOtp,
  resendRegistrationOtp
} from "./auth.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { upload, validateUploadedFile } from "../../middleware/uploadMiddleware.js";

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many authentication attempts. Please try again later.",
  keyPrefix: "auth"
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: "Too many file upload requests. Please wait a minute.",
  keyPrefix: "upload"
});

const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: "Too many OTP generation requests. Please try again later.",
  keyPrefix: "otp"
});

authRouter.post("/register", authRateLimiter, uploadRateLimiter, upload.single("studentProof"), validateUploadedFile, register);
authRouter.post("/verify-registration-otp", authRateLimiter, verifyRegistrationOtp);
authRouter.post("/resend-registration-otp", otpRateLimiter, resendRegistrationOtp);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", protect, logout);
authRouter.post("/forgot-password", otpRateLimiter, forgotPassword);
authRouter.post("/reset-password", authRateLimiter, resetPassword);
authRouter.get("/me", protect, getCurrentUser);
authRouter.patch("/me", protect, updateProfile);
authRouter.post("/change-password", protect, authRateLimiter, changePassword);
authRouter.post(
  "/student-verification/submit",
  protect,
  authRateLimiter,
  uploadRateLimiter,
  upload.single("studentProof"),
  validateUploadedFile,
  submitStudentVerification
);
authRouter.post("/student-verification/send-college-email-otp", protect, otpRateLimiter, sendCollegeEmailOtp);
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

