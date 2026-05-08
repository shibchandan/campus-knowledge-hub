import { User } from "./auth.model.js";
import { createToken } from "../../utils/createToken.js";
import crypto from "crypto";
import path from "path";
import { sendEmail } from "../../services/email.service.js";
import { createAuditLog } from "../../services/audit.service.js";
import { env } from "../../config/env.js";
import { removeTempFile, scanFileForMalware } from "../../services/malwareScan.service.js";
import { uploadDirectory } from "../../middleware/uploadMiddleware.js";
import {
  validateAdminCreateUserPayload,
  validateAdminUpdateUserPayload,
  validateChangePasswordPayload,
  validateCollegeEmailOtpPayload,
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateProfilePayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
  validateStudentVerificationSubmissionPayload
} from "./auth.validation.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const COLLEGE_EMAIL_OTP_EXPIRY_MINUTES = 10;
const studentProofMimeMatchers = [/^image\//i, /^application\/pdf$/i];

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

function isAllowedStudentProof(file) {
  return Boolean(
    file?.mimetype && studentProofMimeMatchers.some((pattern) => pattern.test(file.mimetype))
  );
}

function buildStudentProofPath(userId) {
  return `/api/auth/student-proof/${userId}`;
}

function serializeUserForClient(user, req) {
  const payload = user.toSafeObject();

  if (payload.studentProofStoredName || user.studentProofStoredName) {
    const proofPath = buildStudentProofPath(payload.id || user._id);
    payload.studentProofUrl = req
      ? `${req.protocol}://${req.get("host")}${proofPath}`
      : proofPath;
  } else {
    payload.studentProofUrl = "";
  }

  return payload;
}

async function issueCollegeEmailOtp(user) {
  if (!user.officialCollegeEmail) {
    const error = new Error("Add an official college email before requesting verification.");
    error.statusCode = 400;
    throw error;
  }

  if (
    user.collegeEmailOtpSentAt &&
    Date.now() - user.collegeEmailOtpSentAt.getTime() < OTP_COOLDOWN_SECONDS * 1000
  ) {
    const error = new Error(
      `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another college email OTP.`
    );
    error.statusCode = 429;
    throw error;
  }

  const otp = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  user.collegeEmailOtpHash = hashOtp(otp);
  user.collegeEmailOtpExpiresAt = new Date(Date.now() + COLLEGE_EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);
  user.collegeEmailOtpSentAt = new Date();
  await user.save();

  await sendEmail({
    to: user.officialCollegeEmail,
    subject: "Campus Knowledge Hub college email verification OTP",
    text: `Your Campus Knowledge Hub college email verification OTP is ${otp}. It expires in ${COLLEGE_EMAIL_OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your Campus Knowledge Hub college email verification OTP is <strong>${otp}</strong>.</p><p>This code will expire in ${COLLEGE_EMAIL_OTP_EXPIRY_MINUTES} minutes.</p>`
  });
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

    const requestedRepresentative = payload.role === "representative";
    if (payload.role === "student") {
      if (!req.file) {
        const error = new Error("Student proof document is required for student registration.");
        error.statusCode = 400;
        throw error;
      }

      if (!isAllowedStudentProof(req.file)) {
        const error = new Error("Student proof must be an image or PDF document.");
        error.statusCode = 400;
        throw error;
      }

      await scanFileForMalware(req.file.path);
    }

    const user = await User.create({
      ...payload,
      role: requestedRepresentative ? "student" : payload.role,
      representativeRequestStatus: requestedRepresentative ? "pending" : "none",
      studentVerificationStatus: payload.role === "student" ? "pending" : "none",
      studentProofOriginalName: req.file?.originalname || "",
      studentProofStoredName: req.file?.filename || "",
      studentProofMimeType: req.file?.mimetype || "",
      studentProofUrl: "",
      officialCollegeEmailVerified: false
    });

    let collegeEmailOtpSent = false;
    if (payload.role === "student" && payload.officialCollegeEmail) {
      try {
        await issueCollegeEmailOtp(
          await User.findById(user._id).select(
            "+collegeEmailOtpHash +collegeEmailOtpExpiresAt +collegeEmailOtpSentAt"
          )
        );
        collegeEmailOtpSent = true;
      } catch {
        collegeEmailOtpSent = false;
      }
    }

    const token = createToken({ id: user._id, role: user.role, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: requestedRepresentative
        ? "Representative request submitted to admin. Until approval, this account will continue as student access."
        : payload.role === "student" && collegeEmailOtpSent
          ? "Registration successful. A college email OTP has been sent to your official college email for verification."
        : "Registration successful.",
      data: { token, user: serializeUserForClient(user, req) }
    });
  } catch (error) {
    if (req.file?.path) {
      await removeTempFile(req.file.path);
    }
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
    res.json({ success: true, data: { token, user: serializeUserForClient(user, req) } });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(_req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users.map((user) => serializeUserForClient(user, _req)) });
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
    res.status(201).json({ success: true, data: serializeUserForClient(user, req) });
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

    const nextRole = updates.role ?? user.role;
    const nextStatus = updates.status ?? user.status ?? "active";
    const isCurrentlyActiveAdmin = user.role === "admin" && (user.status || "active") === "active";
    const wouldStopBeingActiveAdmin = nextRole !== "admin" || nextStatus !== "active";

    if (isCurrentlyActiveAdmin && wouldStopBeingActiveAdmin) {
      const otherActiveAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: "admin",
        status: "active"
      });

      if (otherActiveAdmins === 0) {
        const error = new Error("At least one active admin must remain on the platform.");
        error.statusCode = 400;
        throw error;
      }
    }

    if (updates.role === "representative") {
      updates.representativeRequestStatus = "approved";
      updates.studentVerificationStatus = "none";
    }

    if (updates.role === "student" && user.representativeRequestStatus === "pending") {
      updates.representativeRequestStatus =
        updates.representativeRequestStatus || "rejected";
    }

    if (updates.role === "student") {
      const nextCollegeName = updates.collegeName ?? user.collegeName ?? "";
      const nextCollegeStudentId = updates.collegeStudentId ?? user.collegeStudentId ?? "";

      if (nextCollegeName && nextCollegeStudentId && updates.studentVerificationStatus === undefined) {
        updates.studentVerificationStatus = user.studentVerificationStatus === "verified" ? "verified" : "pending";
      }

      if ((!nextCollegeName || !nextCollegeStudentId) && updates.studentVerificationStatus === undefined) {
        updates.studentVerificationStatus = "none";
      }
    }

    if (updates.studentVerificationStatus === "verified") {
      const nextCollegeName = updates.collegeName ?? user.collegeName ?? "";
      const nextCollegeStudentId = updates.collegeStudentId ?? user.collegeStudentId ?? "";
      const nextStudentProofStoredName = user.studentProofStoredName || "";

      if (!nextCollegeName || !nextCollegeStudentId) {
        const error = new Error("Verified student accounts must have both college name and college ID.");
        error.statusCode = 400;
        throw error;
      }

      if (!nextStudentProofStoredName) {
        const error = new Error("Upload and review a student proof document before verifying the student.");
        error.statusCode = 400;
        throw error;
      }
    }

    if (updates.officialCollegeEmail !== undefined && updates.officialCollegeEmail !== user.officialCollegeEmail) {
      updates.officialCollegeEmailVerified = false;
      updates.collegeEmailOtpHash = "";
      updates.collegeEmailOtpExpiresAt = null;
      updates.collegeEmailOtpSentAt = null;
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

    res.json({ success: true, data: serializeUserForClient(user, req) });
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

    res.json({ success: true, data: serializeUserForClient(user, req) });
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

    res.json({ success: true, data: serializeUserForClient(user, req) });
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

export async function sendCollegeEmailOtp(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select(
      "+collegeEmailOtpHash +collegeEmailOtpExpiresAt +collegeEmailOtpSentAt"
    );

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== "student") {
      const error = new Error("Only student accounts can verify college email.");
      error.statusCode = 403;
      throw error;
    }

    await issueCollegeEmailOtp(user);

    res.json({
      success: true,
      message: "College email OTP sent successfully."
    });
  } catch (error) {
    next(error);
  }
}

export async function submitStudentVerification(req, res, next) {
  try {
    const payload = validateStudentVerificationSubmissionPayload(req.body);
    const user = await User.findById(req.user.id).select(
      "+collegeEmailOtpHash +collegeEmailOtpExpiresAt +collegeEmailOtpSentAt"
    );

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== "student") {
      const error = new Error("Only student accounts can submit student verification.");
      error.statusCode = 403;
      throw error;
    }

    if (!req.file && !user.studentProofStoredName) {
      const error = new Error("Upload a student proof document to continue verification.");
      error.statusCode = 400;
      throw error;
    }

    if (req.file) {
      if (!isAllowedStudentProof(req.file)) {
        const error = new Error("Student proof must be an image or PDF document.");
        error.statusCode = 400;
        throw error;
      }

      await scanFileForMalware(req.file.path);
    }

    const emailChanged = payload.officialCollegeEmail !== (user.officialCollegeEmail || "");

    user.collegeName = payload.collegeName;
    user.collegeStudentId = payload.collegeStudentId;
    user.officialCollegeEmail = payload.officialCollegeEmail;
    user.studentVerificationStatus = "pending";

    if (emailChanged) {
      user.officialCollegeEmailVerified = false;
      user.collegeEmailOtpHash = "";
      user.collegeEmailOtpExpiresAt = null;
      user.collegeEmailOtpSentAt = null;
    }

    if (req.file) {
      user.studentProofOriginalName = req.file.originalname;
      user.studentProofStoredName = req.file.filename;
      user.studentProofMimeType = req.file.mimetype;
      user.studentProofUrl = "";
    }

    await user.save();

    let otpSent = false;
    if (user.officialCollegeEmail && !user.officialCollegeEmailVerified) {
      try {
        await issueCollegeEmailOtp(user);
        otpSent = true;
      } catch {
        otpSent = false;
      }
    }

    await createAuditLog({
      req,
      action: "student.submit_verification",
      entityType: "user",
      entityId: user._id,
      metadata: {
        collegeName: user.collegeName,
        hasOfficialCollegeEmail: Boolean(user.officialCollegeEmail),
        hasStudentProof: Boolean(user.studentProofStoredName)
      }
    });

    res.json({
      success: true,
      message: otpSent
        ? "Student verification submitted. Admin review is pending, and a college email OTP has been sent."
        : "Student verification submitted. Admin review is pending.",
      data: serializeUserForClient(user, req)
    });
  } catch (error) {
    if (req.file?.path) {
      await removeTempFile(req.file.path);
    }
    next(error);
  }
}

export async function verifyCollegeEmailOtp(req, res, next) {
  try {
    const { otp } = validateCollegeEmailOtpPayload(req.body);
    const user = await User.findById(req.user.id).select(
      "+collegeEmailOtpHash +collegeEmailOtpExpiresAt +collegeEmailOtpSentAt"
    );

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (!user.collegeEmailOtpHash || !user.collegeEmailOtpExpiresAt) {
      const error = new Error("Request a college email OTP first.");
      error.statusCode = 400;
      throw error;
    }

    if (user.collegeEmailOtpExpiresAt <= new Date()) {
      user.collegeEmailOtpHash = "";
      user.collegeEmailOtpExpiresAt = null;
      await user.save();
      const error = new Error("College email OTP has expired. Request a new one.");
      error.statusCode = 400;
      throw error;
    }

    if (!timingSafeOtpMatch(otp, user.collegeEmailOtpHash)) {
      const error = new Error("Invalid college email OTP.");
      error.statusCode = 400;
      throw error;
    }

    user.officialCollegeEmailVerified = true;
    user.collegeEmailOtpHash = "";
    user.collegeEmailOtpExpiresAt = null;
    user.collegeEmailOtpSentAt = null;
    await user.save();

    res.json({
      success: true,
      message: "Official college email verified successfully.",
      data: serializeUserForClient(user, req)
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadStudentProof(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(targetUser._id) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      const error = new Error("You are not allowed to access this proof document.");
      error.statusCode = 403;
      throw error;
    }

    if (!targetUser.studentProofStoredName) {
      const error = new Error("No proof document uploaded for this user.");
      error.statusCode = 404;
      throw error;
    }

    const proofPath = path.resolve(uploadDirectory, targetUser.studentProofStoredName);
    res.sendFile(proofPath, {
      headers: {
        "Content-Disposition": `inline; filename="${targetUser.studentProofOriginalName || "student-proof"}"`
      }
    });
  } catch (error) {
    next(error);
  }
}
