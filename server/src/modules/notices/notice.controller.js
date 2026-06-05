import { Notice } from "./notice.model.js";
import { CollegeCourse } from "../governance/governance.model.js";
import { validateNoticePayload } from "./notice.validation.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";
import { requirePasswordConfirmation } from "../../utils/passwordConfirmation.js";
import { collegeNameMatches, resolveStudentCollegeScope } from "../../utils/studentCollegeAccess.js";

async function assertRepresentativeCollegeAccess(user, collegeName) {
  const normalizedCollege = normalizeCollegeName(collegeName);

  if (collegeNameMatches(user.collegeName, normalizedCollege)) {
    return normalizedCollege;
  }

  const course = await CollegeCourse.findOne({
    collegeNameNormalized: normalizedCollege,
    addedByRepresentative: user.id
  });

  if (!course) {
    throw createHttpError(
      "Representative can manage notices only for their directly assigned college or approved colleges assigned to them.",
      403
    );
  }

  return normalizedCollege;
}

export async function listNotices(req, res, next) {
  try {
    const collegeScope = resolveStudentCollegeScope(req, req.query.collegeName, {
      mismatchMessage: "Students can view notices only for their assigned college."
    });
    const collegeName = collegeScope.collegeName;
    const filters = { isPublished: true };

    if (req.user?.role === "admin" && req.query.includeUnpublished === "true") {
      delete filters.isPublished;
    }

    if (req.user?.role === "representative" && req.query.includeUnpublished === "true") {
      delete filters.isPublished;
      const ownedCourses = await CollegeCourse.find({ addedByRepresentative: req.user.id }).select(
        "collegeNameNormalized"
      );
      const ownedCollegeNames = new Set(ownedCourses.map((course) => course.collegeNameNormalized));
      const directCollegeName = normalizeCollegeName(req.user.collegeName || "");
      if (directCollegeName) {
        ownedCollegeNames.add(directCollegeName);
      }

      if (collegeName) {
        const normalizedCollege = normalizeCollegeName(collegeName);
        if (!ownedCollegeNames.has(normalizedCollege)) {
          throw createHttpError(
            "Representative can view unpublished notices only for their assigned colleges.",
            403
          );
        }
        filters.collegeNameNormalized = normalizedCollege;
      } else {
        filters.collegeNameNormalized = { $in: [...ownedCollegeNames] };
      }
    }

    if (req.user?.role === "student") {
      filters.$or = [
        { collegeNameNormalized: collegeScope.collegeNameNormalized },
        { collegeNameNormalized: "" }
      ];
    } else if (collegeName && !filters.collegeNameNormalized) {
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
    if (req.user.role === "representative") {
      await assertRepresentativeCollegeAccess(req.user, payload.collegeName);
    }
    const notice = await Notice.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: `${req.user.role}.create_notice`,
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

    if (req.user.role === "representative") {
      if (!collegeNameMatches(req.user.collegeName, notice.collegeNameNormalized)) {
        const currentCollegeAllowed = await CollegeCourse.findOne({
          collegeNameNormalized: notice.collegeNameNormalized,
          addedByRepresentative: req.user.id
        });

        if (!currentCollegeAllowed) {
          throw createHttpError("You are not allowed to edit this notice.", 403);
        }
      }

      await assertRepresentativeCollegeAccess(req.user, payload.collegeName);
    }

    Object.assign(notice, payload);
    await notice.save();
    await createAuditLog({
      req,
      action: `${req.user.role}.update_notice`,
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
    await requirePasswordConfirmation(req);
    const noticeId = readMongoId(req.params.noticeId, { field: "noticeId" });
    const notice = await Notice.findById(noticeId);

    if (!notice) {
      throw createHttpError("Notice not found.", 404);
    }

    if (req.user.role === "representative") {
      if (!collegeNameMatches(req.user.collegeName, notice.collegeNameNormalized)) {
        const allowedCourse = await CollegeCourse.findOne({
          collegeNameNormalized: notice.collegeNameNormalized,
          addedByRepresentative: req.user.id
        });

        if (!allowedCourse) {
          throw createHttpError("You are not allowed to delete this notice.", 403);
        }
      }
    }

    await notice.deleteOne();
    await createAuditLog({
      req,
      action: `${req.user.role}.delete_notice`,
      entityType: "notice",
      entityId: notice._id,
      metadata: { title: notice.title, collegeName: notice.collegeName }
    });
    res.json({ success: true, message: "Notice deleted successfully." });
  } catch (error) {
    next(error);
  }
}
