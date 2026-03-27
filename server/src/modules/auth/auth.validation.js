const validRegisterRoles = new Set(["student", "representative"]);
const validAdminRoles = new Set(["student", "representative", "admin"]);
const validStatuses = new Set(["active", "suspended", "banned"]);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function validateRegisterPayload(payload) {
  const fullName = payload.fullName?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const role = payload.role?.trim() || "student";

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

  return { fullName, email, password, role };
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

  return { fullName, email, password, role, status };
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
