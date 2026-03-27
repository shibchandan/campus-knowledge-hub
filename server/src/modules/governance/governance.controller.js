import { CollegeCourse, CollegeProfile, CollegeRequest } from "./governance.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  validateAdminDecisionPayload,
  validateCollegeProfilePayload,
  validateCollegeRequestPayload
} from "./governance.validation.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";

export async function createCollegeRequest(req, res, next) {
  try {
    const payload = validateCollegeRequestPayload(req.body);

    const existingApprovedCourse = await CollegeCourse.findOne({
      collegeNameNormalized: normalizeCollegeName(payload.collegeName),
      courseNameNormalized: normalizeCollegeName(payload.courseName)
    });

    if (existingApprovedCourse) {
      throw createHttpError(
        "This college and course is already approved on the platform.",
        409
      );
    }

    const conflictingRequest = await CollegeRequest.findOne({
      collegeNameNormalized: normalizeCollegeName(payload.collegeName),
      courseNameNormalized: normalizeCollegeName(payload.courseName),
      status: { $in: ["pending", "approved"] },
      representative: { $ne: req.user.id }
    });

    if (conflictingRequest) {
      throw createHttpError(
        "Another representative already submitted this same college and course.",
        409
      );
    }

    const existingOwnPending = await CollegeRequest.findOne({
      collegeNameNormalized: normalizeCollegeName(payload.collegeName),
      courseNameNormalized: normalizeCollegeName(payload.courseName),
      status: "pending",
      representative: req.user.id
    });

    if (existingOwnPending) {
      throw createHttpError("You already have a pending request for this college and course.", 409);
    }

    const request = await CollegeRequest.create({
      ...payload,
      representative: req.user.id
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

export async function getRepresentativeRequests(req, res, next) {
  try {
    const requests = await CollegeRequest.find({ representative: req.user.id }).sort({
      createdAt: -1
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function getPendingRequestsForAdmin(_req, res, next) {
  try {
    const requests = await CollegeRequest.find({ status: "pending" })
      .populate("representative", "fullName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function decideCollegeRequest(req, res, next) {
  try {
    const requestId = readMongoId(req.params.requestId, { field: "requestId" });
    const { action, decisionNote } = validateAdminDecisionPayload(req.body);
    const request = await CollegeRequest.findById(requestId);

    if (!request) {
      throw createHttpError("Request not found.", 404);
    }

    if (request.status !== "pending") {
      throw createHttpError("Only pending requests can be reviewed.", 409);
    }

    if (action === "reject") {
      request.status = "rejected";
      request.decisionNote = decisionNote;
      request.adminDecisionBy = req.user.id;
      await request.save();
      await createAuditLog({
        req,
        action: "admin.reject_college_request",
        entityType: "college_request",
        entityId: request._id,
        metadata: { collegeName: request.collegeName, courseName: request.courseName }
      });

      res.json({ success: true, data: request });
      return;
    }

    const existingCourse = await CollegeCourse.findOne({
      collegeNameNormalized: request.collegeNameNormalized,
      courseNameNormalized: request.courseNameNormalized
    });

    if (existingCourse) {
      throw createHttpError(
        "Cannot approve. This college and course already exists in approved records.",
        409
      );
    }

    const approved = await CollegeCourse.create({
      collegeName: request.collegeName,
      courseName: request.courseName,
      semesterCount: request.semesterCount,
      addedByRepresentative: request.representative,
      approvedByAdmin: req.user.id
    });

    request.status = "approved";
    request.decisionNote = decisionNote;
    request.adminDecisionBy = req.user.id;
    await request.save();
    await createAuditLog({
      req,
      action: "admin.approve_college_request",
      entityType: "college_request",
      entityId: request._id,
      metadata: { collegeName: request.collegeName, courseName: request.courseName }
    });

    res.json({ success: true, data: { request, approved } });
  } catch (error) {
    next(error);
  }
}

export async function getApprovedCollegeCourses(_req, res, next) {
  try {
    const courses = await CollegeCourse.find()
      .populate("addedByRepresentative", "fullName email")
      .populate("approvedByAdmin", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedNames = [...new Set(courses.map((course) => course.collegeNameNormalized))];
    const profiles = await CollegeProfile.find({
      collegeNameNormalized: { $in: normalizedNames }
    })
      .populate("enteredByRepresentative", "fullName email")
      .lean();

    const profileByCollege = new Map(
      profiles.map((profile) => [profile.collegeNameNormalized, profile])
    );

    const data = courses.map((course) => ({
      ...course,
      profile: profileByCollege.get(course.collegeNameNormalized) || null
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createApprovedCollegeCourse(req, res, next) {
  try {
    const payload = validateCollegeRequestPayload(req.body);
    const normalizedCollege = normalizeCollegeName(payload.collegeName);
    const normalizedCourse = normalizeCollegeName(payload.courseName);

    const existingCourse = await CollegeCourse.findOne({
      collegeNameNormalized: normalizedCollege,
      courseNameNormalized: normalizedCourse
    });

    if (existingCourse) {
      throw createHttpError("This college and course is already approved on the platform.", 409);
    }

    const course = await CollegeCourse.create({
      collegeName: payload.collegeName,
      courseName: payload.courseName,
      semesterCount: payload.semesterCount,
      addedByRepresentative: req.user.id,
      approvedByAdmin: req.user.id
    });

    const populatedCourse = await CollegeCourse.findById(course._id)
      .populate("addedByRepresentative", "fullName email")
      .populate("approvedByAdmin", "fullName email");

    await createAuditLog({
      req,
      action: "admin.create_college_course",
      entityType: "college_course",
      entityId: course._id,
      metadata: { collegeName: course.collegeName, courseName: course.courseName }
    });

    res.status(201).json({ success: true, data: populatedCourse });
  } catch (error) {
    next(error);
  }
}

export async function getRepresentativeColleges(req, res, next) {
  try {
    const courses = await CollegeCourse.find({ addedByRepresentative: req.user.id })
      .populate("approvedByAdmin", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedNames = [...new Set(courses.map((course) => course.collegeNameNormalized))];
    const profiles = await CollegeProfile.find({
      collegeNameNormalized: { $in: normalizedNames }
    })
      .populate("enteredByRepresentative", "fullName email")
      .lean();

    const profileByCollege = new Map(
      profiles.map((profile) => [profile.collegeNameNormalized, profile])
    );

    const data = courses.map((course) => ({
      ...course,
      profile: profileByCollege.get(course.collegeNameNormalized) || null
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateApprovedCollegeCourse(req, res, next) {
  try {
    const courseId = readMongoId(req.params.courseId, { field: "courseId" });
    const payload = validateCollegeRequestPayload(req.body);
    const course = await CollegeCourse.findById(courseId);

    if (!course) {
      throw createHttpError("Approved college course not found.", 404);
    }

    if (
      req.user.role === "representative" &&
      course.addedByRepresentative.toString() !== req.user.id
    ) {
      throw createHttpError("You can edit only your own college details.", 403);
    }

    const normalizedCollege = normalizeCollegeName(payload.collegeName);
    const normalizedCourse = normalizeCollegeName(payload.courseName);

    const conflictingCourse = await CollegeCourse.findOne({
      _id: { $ne: courseId },
      collegeNameNormalized: normalizedCollege,
      courseNameNormalized: normalizedCourse
    });

    if (conflictingCourse) {
      throw createHttpError("Another approved record already exists for this college and course.", 409);
    }

    const previousCollegeNameNormalized = course.collegeNameNormalized;
    const previousCollegeName = course.collegeName;
    const isCollegeRenamed = previousCollegeNameNormalized !== normalizedCollege;

    if (isCollegeRenamed) {
      const profile = await CollegeProfile.findOne({
        collegeNameNormalized: previousCollegeNameNormalized,
        enteredByRepresentative: course.addedByRepresentative
      });

      if (profile) {
        const hasOtherCoursesForPreviousCollege = await CollegeCourse.exists({
          _id: { $ne: course._id },
          collegeNameNormalized: previousCollegeNameNormalized,
          addedByRepresentative: course.addedByRepresentative
        });

        if (hasOtherCoursesForPreviousCollege) {
          throw createHttpError(
            `This college name is shared by other approved courses under ${previousCollegeName}. Update those records first before renaming the college.`,
            409
          );
        }

        const destinationProfile = await CollegeProfile.findOne({
          collegeNameNormalized: normalizedCollege
        });

        if (destinationProfile) {
          throw createHttpError(
            `A college profile already exists for ${payload.collegeName}. Delete or rename that profile first.`,
            409
          );
        }
      }
    }

    course.collegeName = payload.collegeName;
    course.courseName = payload.courseName;
    course.semesterCount = payload.semesterCount;
    await course.save();

    if (isCollegeRenamed) {
      const profile = await CollegeProfile.findOne({
        collegeNameNormalized: previousCollegeNameNormalized,
        enteredByRepresentative: course.addedByRepresentative
      });

      if (profile) {
        profile.collegeName = course.collegeName;
        await profile.save();
      }
    }

    const updatedCourse = await CollegeCourse.findById(course._id)
      .populate("addedByRepresentative", "fullName email")
      .populate("approvedByAdmin", "fullName email");
    await createAuditLog({
      req,
      action: "college_course.update",
      entityType: "college_course",
      entityId: course._id,
      metadata: { collegeName: course.collegeName, courseName: course.courseName }
    });

    res.json({ success: true, data: updatedCourse });
  } catch (error) {
    next(error);
  }
}

export async function deleteApprovedCollegeCourse(req, res, next) {
  try {
    const courseId = readMongoId(req.params.courseId, { field: "courseId" });
    const course = await CollegeCourse.findById(courseId);

    if (!course) {
      throw createHttpError("Approved college course not found.", 404);
    }

    if (
      req.user.role === "representative" &&
      course.addedByRepresentative.toString() !== req.user.id
    ) {
      throw createHttpError("You can delete only your own college details.", 403);
    }

    await CollegeCourse.findByIdAndDelete(courseId);

    const hasOtherCourses = await CollegeCourse.exists({
      collegeNameNormalized: course.collegeNameNormalized,
      addedByRepresentative: course.addedByRepresentative
    });

    let profileDeleted = false;
    if (!hasOtherCourses) {
      const deletedProfile = await CollegeProfile.findOneAndDelete({
        collegeNameNormalized: course.collegeNameNormalized,
        enteredByRepresentative: course.addedByRepresentative
      });
      profileDeleted = Boolean(deletedProfile);
    }

    res.json({
      success: true,
      message: profileDeleted
        ? "College course and its profile were deleted successfully."
        : "College course deleted successfully."
    });
    await createAuditLog({
      req,
      action: "college_course.delete",
      entityType: "college_course",
      entityId: courseId,
      metadata: { profileDeleted, collegeName: course.collegeName, courseName: course.courseName }
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertCollegeProfile(req, res, next) {
  try {
    const payload = validateCollegeProfilePayload(req.body);
    const normalizedCollege = normalizeCollegeName(payload.collegeName);

    if (req.user.role === "representative") {
      const hasApprovedCourse = await CollegeCourse.findOne({
        collegeNameNormalized: normalizedCollege,
        addedByRepresentative: req.user.id
      });

      if (!hasApprovedCourse) {
        throw createHttpError(
          "Representative can update profile only for approved colleges assigned to them.",
          403
        );
      }
    }

    const profile = await CollegeProfile.findOneAndUpdate(
      { collegeNameNormalized: normalizedCollege },
      {
        ...payload,
        enteredByRepresentative: req.user.id
      },
      { new: true, upsert: true, runValidators: true }
    ).populate("enteredByRepresentative", "fullName email");
    await createAuditLog({
      req,
      action: "college_profile.upsert",
      entityType: "college_profile",
      entityId: profile._id,
      metadata: { collegeName: profile.collegeName }
    });

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function deleteCollegeProfile(req, res, next) {
  try {
    const profileId = readMongoId(req.params.profileId, { field: "profileId" });
    const profile = await CollegeProfile.findById(profileId);

    if (!profile) {
      throw createHttpError("College profile not found.", 404);
    }

    if (
      req.user.role === "representative" &&
      profile.enteredByRepresentative.toString() !== req.user.id
    ) {
      throw createHttpError("You can delete only your own college profile.", 403);
    }

    await CollegeProfile.findByIdAndDelete(profileId);
    await createAuditLog({
      req,
      action: "college_profile.delete",
      entityType: "college_profile",
      entityId: profileId,
      metadata: { collegeName: profile.collegeName }
    });

    res.json({ success: true, message: "College profile deleted successfully." });
  } catch (error) {
    next(error);
  }
}

export async function getCollegeProfile(req, res, next) {
  try {
    const collegeName = readString(req.query.collegeName, {
      field: "collegeName",
      min: 3,
      max: 120
    });
    const normalizedCollege = normalizeCollegeName(collegeName);
    const profile = await CollegeProfile.findOne({
      collegeNameNormalized: normalizedCollege
    }).populate("enteredByRepresentative", "fullName email");

    if (!profile) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}
