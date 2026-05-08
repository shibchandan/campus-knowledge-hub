import { UserSettings } from "./settings.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import { createHttpError, readString } from "../../utils/requestValidation.js";

const defaultPreferences = {
  emailAnnouncements: true,
  noticeAlerts: true,
  quizReminders: true,
  aiHistoryVisible: true,
  darkModePreferred: true
};

async function getOrCreateSettings(userId) {
  let settings = await UserSettings.findOne({ user: userId });

  if (!settings) {
    settings = await UserSettings.create({
      user: userId,
      notificationPreferences: defaultPreferences,
      blockedUsers: []
    });
  }

  return settings;
}

function readBooleanField(value, field) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  throw createHttpError(`${field} must be true or false.`);
}

function serializeSettings(settings) {
  const payload = settings.toObject();

  payload.notificationPreferences = {
    ...defaultPreferences,
    ...(payload.notificationPreferences || {})
  };

  payload.blockedUsers = (payload.blockedUsers || []).map((item) => ({
    _id: item._id,
    label: item.label,
    email: item.email || "",
    reason: item.reason || "",
    blockedAt: item.blockedAt
  }));

  return payload;
}

export async function getMySettings(req, res, next) {
  try {
    const settings = await getOrCreateSettings(req.user.id);
    res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
}

export async function updateMyPreferences(req, res, next) {
  try {
    const settings = await getOrCreateSettings(req.user.id);
    const incoming = req.body || {};
    const nextPreferences = {
      ...defaultPreferences,
      ...(settings.notificationPreferences?.toObject?.() || settings.notificationPreferences || {})
    };
    const allowedKeys = Object.keys(defaultPreferences);
    const updates = {};

    allowedKeys.forEach((key) => {
      if (incoming[key] !== undefined) {
        const parsed = readBooleanField(incoming[key], key);
        nextPreferences[key] = parsed;
        updates[key] = parsed;
      }
    });

    settings.notificationPreferences = nextPreferences;
    await settings.save();

    await createAuditLog({
      req,
      action: "settings.update_preferences",
      entityType: "settings",
      entityId: settings._id,
      metadata: updates
    });

    res.json({
      success: true,
      message: "Settings preferences updated successfully.",
      data: serializeSettings(settings)
    });
  } catch (error) {
    next(error);
  }
}

export async function addBlockedUser(req, res, next) {
  try {
    const settings = await getOrCreateSettings(req.user.id);
    const label = readString(req.body.label, { field: "Blocked user label", min: 2, max: 120 });
    const email = readString(req.body.email, {
      field: "Blocked user email",
      required: false,
      max: 160
    }).toLowerCase();
    const reason = readString(req.body.reason, {
      field: "Blocked user reason",
      required: false,
      max: 220
    });

    const duplicate = settings.blockedUsers.some(
      (item) =>
        item.label.toLowerCase() === label.toLowerCase() ||
        (email && item.email && item.email.toLowerCase() === email)
    );

    if (duplicate) {
      throw createHttpError("This blocked user entry already exists.", 409);
    }

    settings.blockedUsers.push({
      label,
      email,
      reason
    });
    await settings.save();

    const blockedEntry = settings.blockedUsers[settings.blockedUsers.length - 1];
    await createAuditLog({
      req,
      action: "settings.add_blocked_user",
      entityType: "settings",
      entityId: settings._id,
      metadata: {
        label: blockedEntry.label,
        email: blockedEntry.email
      }
    });

    res.status(201).json({
      success: true,
      message: "Blocked user added successfully.",
      data: {
        _id: blockedEntry._id,
        label: blockedEntry.label,
        email: blockedEntry.email || "",
        reason: blockedEntry.reason || "",
        blockedAt: blockedEntry.blockedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function removeBlockedUser(req, res, next) {
  try {
    const settings = await getOrCreateSettings(req.user.id);
    const blockedUserId = readString(req.params.blockedUserId, {
      field: "blockedUserId",
      min: 6,
      max: 80
    });
    const existing = settings.blockedUsers.id(blockedUserId);

    if (!existing) {
      throw createHttpError("Blocked user entry not found.", 404);
    }

    const removedLabel = existing.label;
    existing.deleteOne();
    await settings.save();

    await createAuditLog({
      req,
      action: "settings.remove_blocked_user",
      entityType: "settings",
      entityId: settings._id,
      metadata: { blockedUserId, label: removedLabel }
    });

    res.json({
      success: true,
      message: "Blocked user removed successfully.",
      data: serializeSettings(settings)
    });
  } catch (error) {
    next(error);
  }
}
