import { Notice } from "./notice.model.js";
import { validateNoticePayload } from "./notice.validation.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";

export async function listNotices(req, res, next) {
  try {
    const collegeName = readString(req.query.collegeName, {
      field: "collegeName",
      required: false,
      min: 3,
      max: 120
    });
    const filters = { isPublished: true };

    if (req.user?.role === "admin" && req.query.includeUnpublished === "true") {
      delete filters.isPublished;
    }

    if (collegeName) {
      filters.$or = [
        { collegeNameNormalized: normalizeCollegeName(collegeName) },
        { collegeNameNormalized: "" }
      ];
    }

    const notices = await Notice.find(filters)
      .populate("createdByAdmin", "fullName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: notices });
  } catch (error) {
    next(error);
  }
}

export async function createNotice(req, res, next) {
  try {
    const payload = validateNoticePayload(req.body);
    const notice = await Notice.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: "admin.create_notice",
      entityType: "notice",
      entityId: notice._id,
      metadata: { title: notice.title, collegeName: notice.collegeName }
    });

    const populatedNotice = await Notice.findById(notice._id).populate("createdByAdmin", "fullName email");
    res.status(201).json({ success: true, data: populatedNotice });
  } catch (error) {
    next(error);
  }
}

export async function updateNotice(req, res, next) {
  try {
    const payload = validateNoticePayload(req.body);
    const noticeId = readMongoId(req.params.noticeId, { field: "noticeId" });
    const notice = await Notice.findById(noticeId);

    if (!notice) {
      throw createHttpError("Notice not found.", 404);
    }

    Object.assign(notice, payload);
    await notice.save();
    await createAuditLog({
      req,
      action: "admin.update_notice",
      entityType: "notice",
      entityId: notice._id,
      metadata: { title: notice.title, collegeName: notice.collegeName }
    });

    const populatedNotice = await Notice.findById(notice._id).populate("createdByAdmin", "fullName email");
    res.json({ success: true, data: populatedNotice });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotice(req, res, next) {
  try {
    const noticeId = readMongoId(req.params.noticeId, { field: "noticeId" });
    const notice = await Notice.findById(noticeId);

    if (!notice) {
      throw createHttpError("Notice not found.", 404);
    }

    await notice.deleteOne();
    await createAuditLog({
      req,
      action: "admin.delete_notice",
      entityType: "notice",
      entityId: notice._id,
      metadata: { title: notice.title, collegeName: notice.collegeName }
    });
    res.json({ success: true, message: "Notice deleted successfully." });
  } catch (error) {
    next(error);
  }
}
