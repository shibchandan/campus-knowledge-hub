const validRegisterRoles = new Set(["student", "representative"]);
const validAdminRoles = new Set(["student", "representative", "admin"]);
const validStatuses = new Set(["active", "suspended", "banned"]);
const validRepresentativeRequestStatuses = new Set(["none", "pending", "approved", "rejected"]);
const validStudentVerificationStatuses = new Set(["none", "pending", "verified", "rejected"]);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readOptionalCollegeName(value) {
  if (typeof value !== "string") {
    return "";
  }

  const collegeName = value.trim();

  if (!collegeName) {
    return "";
  }

  if (collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters long.");
  }

  if (collegeName.length > 160) {
    throw createHttpError("College name must be 160 characters or fewer.");
  }

  return collegeName;
}

function readOptionalCollegeStudentId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const collegeStudentId = value.trim().toUpperCase();

  if (!collegeStudentId) {
    return "";
  }

  if (collegeStudentId.length < 4) {
    throw createHttpError("College ID must be at least 4 characters long.");
  }

  if (collegeStudentId.length > 40) {
    throw createHttpError("College ID must be 40 characters or fewer.");
  }

  if (!/^[A-Z0-9/_-]+$/.test(collegeStudentId)) {
    throw createHttpError("College ID can contain only letters, numbers, slash, underscore, and hyphen.");
  }

  return collegeStudentId;
}

function readOptionalEmail(value, field = "Email") {
  if (typeof value !== "string") {
    return "";
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return "";
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError(`Enter a valid ${field.toLowerCase()}.`);
  }

  return email;
}

export function validateRegisterPayload(payload) {
  const fullName = payload.fullName?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const role = payload.role?.trim() || "student";
  const collegeName = readOptionalCollegeName(payload.collegeName);
  const collegeStudentId = readOptionalCollegeStudentId(payload.collegeStudentId);
  const officialCollegeEmail = readOptionalEmail(payload.officialCollegeEmail, "official college email");

  if (!fullName || fullName.length < 2) {
    throw createHttpError("Full name must be at least 2 characters long.");
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError("Enter a valid email address.");
  }

  if (!password || password.length < 6) {
    throw createHttpError("Password must be at least 6 characters long.");
  }

  if (!validRegisterRoles.has(role)) {
    throw createHttpError("Only student and representative self-registration is allowed.");
  }

  if (role === "student") {
    if (!collegeName) {
      throw createHttpError("College name is required for student registration.");
    }

    if (!collegeStudentId) {
      throw createHttpError("College ID is required for student registration.");
    }
  }

  return {
    fullName,
    email,
    password,
    role,
    collegeName,
    collegeStudentId,
    officialCollegeEmail
  };
}

export function validateLoginPayload(payload) {
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();

  if (!email || !password) {
    throw createHttpError("Email and password are required.");
  }

  return { email, password };
}

export function validateProfilePayload(payload) {
  const update = {};

  if (typeof payload.fullName === "string") {
    const fullName = payload.fullName.trim();

    if (fullName.length < 2) {
      throw createHttpError("Full name must be at least 2 characters long.");
    }

    update.fullName = fullName;
  }

  if (typeof payload.avatarUrl === "string") {
    const avatarUrl = payload.avatarUrl.trim();

    if (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl)) {
      throw createHttpError("Avatar URL must start with http:// or https://");
    }

    update.avatarUrl = avatarUrl;
  }

  return update;
}

export function validateChangePasswordPayload(payload) {
  const currentPassword = payload.currentPassword?.trim();
  const newPassword = payload.newPassword?.trim();

  if (!currentPassword || !newPassword) {
    throw createHttpError("Current password and new password are required.");
  }

  if (newPassword.length < 6) {
    throw createHttpError("New password must be at least 6 characters long.");
  }

  if (currentPassword === newPassword) {
    throw createHttpError("New password must be different from your current password.");
  }

  return { currentPassword, newPassword };
}

export function validateAdminCreateUserPayload(payload) {
  const fullName = payload.fullName?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const role = payload.role?.trim() || "student";
  const status = payload.status?.trim() || "active";
  const collegeName = readOptionalCollegeName(payload.collegeName);
  const collegeStudentId = readOptionalCollegeStudentId(payload.collegeStudentId);
  const officialCollegeEmail = readOptionalEmail(payload.officialCollegeEmail, "official college email");

  if (!fullName || fullName.length < 2) {
    throw createHttpError("Full name must be at least 2 characters long.");
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError("Enter a valid email address.");
  }

  if (!password || password.length < 6) {
    throw createHttpError("Password must be at least 6 characters long.");
  }

  if (!validAdminRoles.has(role)) {
    throw createHttpError("Invalid role selected.");
  }

  if (!validStatuses.has(status)) {
    throw createHttpError("Invalid account status selected.");
  }

  return {
    fullName,
    email,
    password,
    role,
    status,
    collegeName,
    collegeStudentId,
    officialCollegeEmail
  };
}

export function validateAdminUpdateUserPayload(payload) {
  const updates = {};

  if (typeof payload.fullName === "string") {
    const fullName = payload.fullName.trim();

    if (fullName.length < 2) {
      throw createHttpError("Full name must be at least 2 characters long.");
    }

    updates.fullName = fullName;
  }

  if (typeof payload.role === "string") {
    const role = payload.role.trim();

    if (!validAdminRoles.has(role)) {
      throw createHttpError("Invalid role selected.");
    }

    updates.role = role;
  }

  if (typeof payload.status === "string") {
    const status = payload.status.trim();

    if (!validStatuses.has(status)) {
      throw createHttpError("Invalid account status selected.");
    }

    updates.status = status;
  }

  if (typeof payload.representativeRequestStatus === "string") {
    const representativeRequestStatus = payload.representativeRequestStatus.trim();

    if (!validRepresentativeRequestStatuses.has(representativeRequestStatus)) {
      throw createHttpError("Invalid representative request status.");
    }

    updates.representativeRequestStatus = representativeRequestStatus;
  }

  if (typeof payload.studentVerificationStatus === "string") {
    const studentVerificationStatus = payload.studentVerificationStatus.trim();

    if (!validStudentVerificationStatuses.has(studentVerificationStatus)) {
      throw createHttpError("Invalid student verification status.");
    }

    updates.studentVerificationStatus = studentVerificationStatus;
  }

  if (payload.collegeName !== undefined) {
    updates.collegeName = readOptionalCollegeName(payload.collegeName);
  }

  if (payload.collegeStudentId !== undefined) {
    updates.collegeStudentId = readOptionalCollegeStudentId(payload.collegeStudentId);
  }

  if (payload.officialCollegeEmail !== undefined) {
    updates.officialCollegeEmail = readOptionalEmail(
      payload.officialCollegeEmail,
      "official college email"
    );
  }

  if (typeof payload.password === "string" && payload.password.trim()) {
    const password = payload.password.trim();

    if (password.length < 6) {
      throw createHttpError("Password must be at least 6 characters long.");
    }

    updates.password = password;
  }

  return updates;
}

export function validateForgotPasswordPayload(payload) {
  const email = payload.email?.trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError("Enter a valid email address.");
  }

  return { email };
}

export function validateResetPasswordPayload(payload) {
  const email = payload.email?.trim().toLowerCase();
  const otp = payload.otp?.toString().trim();
  const newPassword = payload.newPassword?.trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError("Enter a valid email address.");
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw createHttpError("OTP must be a 6-digit code.");
  }

  if (!newPassword || newPassword.length < 6) {
    throw createHttpError("New password must be at least 6 characters long.");
  }

  return { email, otp, newPassword };
}

export function validateCollegeEmailOtpPayload(payload) {
  const otp = payload.otp?.toString().trim();

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw createHttpError("OTP must be a 6-digit code.");
  }

  return { otp };
}

export function validateStudentVerificationSubmissionPayload(payload) {
  const collegeName = readOptionalCollegeName(payload.collegeName);
  const collegeStudentId = readOptionalCollegeStudentId(payload.collegeStudentId);
  const officialCollegeEmail = readOptionalEmail(
    payload.officialCollegeEmail,
    "official college email"
  );

  if (!collegeName) {
    throw createHttpError("College name is required for student verification.");
  }

  if (!collegeStudentId) {
    throw createHttpError("College ID is required for student verification.");
  }

  return {
    collegeName,
    collegeStudentId,
    officialCollegeEmail
  };
}
