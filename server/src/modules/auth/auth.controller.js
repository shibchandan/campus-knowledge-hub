import { User } from "./auth.model.js";
import { createToken } from "../../utils/createToken.js";
import crypto from "crypto";
import { sendEmail } from "../../services/email.service.js";
import { createAuditLog } from "../../services/audit.service.js";
import { env } from "../../config/env.js";
import {
  validateAdminCreateUserPayload,
  validateAdminUpdateUserPayload,
  validateChangePasswordPayload,
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateProfilePayload,
  validateRegisterPayload,
  validateResetPasswordPayload
} from "./auth.validation.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function getCookieSameSite() {
  if (env.cookieSameSite === "strict") {
    return "strict";
  }

  if (env.cookieSameSite === "none") {
    return "none";
  }

  return "lax";
}

function setAuthCookie(res, token) {
  if (!env.authTokenInCookie) {
    return;
  }

  const sameSite = getCookieSameSite();
  const secure = env.cookieSecure || sameSite === "none";

  res.cookie(env.authCookieName, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function genericForgotPasswordResponse(res) {
  res.json({
    success: true,
    message:
      "If an account with this email exists, a password reset OTP has been sent. Check your inbox."
  });
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function isLocked(user) {
  return Boolean(user.passwordResetLockedUntil && user.passwordResetLockedUntil > new Date());
}

function timingSafeOtpMatch(candidateOtp, storedHash) {
  const candidateHashBuffer = Buffer.from(hashOtp(candidateOtp), "hex");
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (candidateHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateHashBuffer, storedHashBuffer);
}

export async function register(req, res, next) {
  try {
    const payload = validateRegisterPayload(req.body);
    const existingUser = await User.findOne({ email: payload.email });

    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create(payload);
    const token = createToken({ id: user._id, role: user.role, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: { token, user: user.toSafeObject() }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = validateLoginPayload(req.body);
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const status = user.status || "active";

    if (status !== "active") {
      const error = new Error(
        status === "banned"
          ? "This account has been banned by an administrator."
          : "This account has been suspended by an administrator."
      );
      error.statusCode = 403;
      throw error;
    }

    const token = createToken({ id: user._id, role: user.role, email: user.email });
    setAuthCookie(res, token);
    res.json({ success: true, data: { token, user: user.toSafeObject() } });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(_req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users.map((user) => user.toSafeObject()) });
  } catch (error) {
    next(error);
  }
}

export async function adminCreateUser(req, res, next) {
  try {
    const payload = validateAdminCreateUserPayload(req.body);
    const existingUser = await User.findOne({ email: payload.email });

    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create(payload);
    await createAuditLog({
      req,
      action: "admin.create_user",
      entityType: "user",
      entityId: user._id,
      metadata: { email: user.email, role: user.role, status: user.status }
    });
    res.status(201).json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const updates = validateAdminUpdateUserPayload(req.body);
    const user = await User.findById(userId).select("+password");

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(user, updates);
    await user.save();
    await createAuditLog({
      req,
      action: "admin.update_user",
      entityType: "user",
      entityId: user._id,
      metadata: updates
    });

    res.json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updates = validateProfilePayload(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(user, updates);
    await user.save();

    res.json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = validateChangePasswordPayload(req.body);
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      const error = new Error("Current password is incorrect.");
      error.statusCode = 401;
      throw error;
    }

    user.password = newPassword;
    await user.save();
    await createAuditLog({
      req,
      action: "user.change_password",
      entityType: "user",
      entityId: user._id,
      message: "User changed password."
    });

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = validateForgotPasswordPayload(req.body);
    const user = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetOtpSentAt +passwordResetLockedUntil +passwordResetVerifiedAt"
    );

    if (!user) {
      genericForgotPasswordResponse(res);
      return;
    }

    if (isLocked(user)) {
      genericForgotPasswordResponse(res);
      return;
    }

    if (
      user.passwordResetOtpSentAt &&
      Date.now() - user.passwordResetOtpSentAt.getTime() < OTP_COOLDOWN_SECONDS * 1000
    ) {
      const error = new Error(
        `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another OTP.`
      );
      error.statusCode = 429;
      throw error;
    }

    const otp = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpSentAt = new Date();
    user.passwordResetLockedUntil = null;
    user.passwordResetVerifiedAt = null;
    await user.save();

    const messageText = `Your Campus Knowledge Hub password reset OTP is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this, please ignore this email.`;

    await sendEmail({
      to: user.email,
      subject: "Campus Knowledge Hub password reset OTP",
      text: messageText,
      html: `<p>Your Campus Knowledge Hub password reset OTP is <strong>${otp}</strong>.</p><p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p><p>If you did not request this, please ignore this email.</p>`
    });

    genericForgotPasswordResponse(res);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = validateResetPasswordPayload(req.body);
    const user = await User.findOne({ email }).select(
      "+password +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetOtpSentAt +passwordResetLockedUntil +passwordResetVerifiedAt"
    );

    if (!user) {
      const error = new Error("Invalid reset request.");
      error.statusCode = 400;
      throw error;
    }

    if (isLocked(user)) {
      const error = new Error(
        `Too many failed OTP attempts. Try again after ${LOCK_MINUTES} minutes.`
      );
      error.statusCode = 429;
      throw error;
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      const error = new Error("Request a fresh OTP before resetting your password.");
      error.statusCode = 400;
      throw error;
    }

    if (user.passwordResetOtpExpiresAt <= new Date()) {
      user.passwordResetOtpHash = "";
      user.passwordResetOtpExpiresAt = null;
      user.passwordResetOtpAttempts = 0;
      user.passwordResetVerifiedAt = null;
      await user.save();

      const error = new Error("OTP has expired. Request a new code.");
      error.statusCode = 400;
      throw error;
    }

    const isValidOtp = timingSafeOtpMatch(otp, user.passwordResetOtpHash);

    if (!isValidOtp) {
      user.passwordResetOtpAttempts += 1;

      if (user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        user.passwordResetLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.passwordResetOtpHash = "";
        user.passwordResetOtpExpiresAt = null;
        user.passwordResetOtpAttempts = 0;
        user.passwordResetVerifiedAt = null;
      }

      await user.save();

      const error = new Error(
        user.passwordResetLockedUntil
          ? `Too many failed OTP attempts. Try again after ${LOCK_MINUTES} minutes.`
          : "Invalid OTP. Please try again."
      );
      error.statusCode = user.passwordResetLockedUntil ? 429 : 400;
      throw error;
    }

    user.password = newPassword;
    user.passwordResetOtpHash = "";
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpSentAt = null;
    user.passwordResetLockedUntil = null;
    user.passwordResetVerifiedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You can now log in with your new password."
    });
  } catch (error) {
    next(error);
  }
}
