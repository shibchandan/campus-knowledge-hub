import { CollegeCourse, CollegeProfile, CollegeRequest } from "./governance.model.js";
import { AcademicSubject } from "../academic/academic.model.js";
import { AcademicStructure } from "../academic/academicStructure.model.js";
import { User } from "../auth/auth.model.js";
import { Notice } from "../notices/notice.model.js";
import { Quiz } from "../quizzes/quiz.model.js";
import { Resource } from "../resources/resource.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import { removeStoredFile } from "../../services/resourceStorage.service.js";
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
import { requirePasswordConfirmation } from "../../utils/passwordConfirmation.js";
import { runWithOptionalTransaction, withSession } from "../../utils/transaction.js";
import {
  normalizeCourseAccessKey,
  resolveStudentCollegeScope
} from "../../utils/studentCollegeAccess.js";

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeGovernancePerson(person, exposeContactDetails) {
  if (!person) {
    return null;
  }

  return exposeContactDetails
    ? person
    : {
        _id: person._id,
        fullName: person.fullName || "",
        role: person.role,
        status: person.status
      };
}

async function findLatestRepresentativeCourse(representativeId, extraFilters = {}, session = null) {
  return withSession(
    CollegeCourse.findOne({
      addedByRepresentative: representativeId,
      ...extraFilters
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("collegeName collegeNameNormalized"),
    session
  );
}

async function syncRepresentativeCollegeName(representativeId, preferredCollegeName = "", session = null) {
  const representative = await withSession(User.findById(representativeId).select("role collegeName"), session);

  if (!representative || representative.role !== "representative") {
    return;
  }

  const preferredCollegeNormalized = preferredCollegeName
    ? normalizeCollegeName(preferredCollegeName)
    : "";
  const currentCollegeNormalized = representative.collegeName
    ? normalizeCollegeName(representative.collegeName)
    : "";

  let nextCollegeName = "";

  if (preferredCollegeNormalized) {
    const matchingPreferredCourse = await findLatestRepresentativeCourse(
      representativeId,
      { collegeNameNormalized: preferredCollegeNormalized },
      session
    );

    if (matchingPreferredCourse?.collegeName) {
      nextCollegeName = matchingPreferredCourse.collegeName;
    }
  }

  if (!nextCollegeName && currentCollegeNormalized) {
    const currentCollegeStillAssigned = await findLatestRepresentativeCourse(
      representativeId,
      { collegeNameNormalized: currentCollegeNormalized },
      session
    );

    if (currentCollegeStillAssigned?.collegeName) {
      nextCollegeName = currentCollegeStillAssigned.collegeName;
    }
  }

  if (!nextCollegeName) {
    const latestCourse = await findLatestRepresentativeCourse(representativeId, {}, session);
    nextCollegeName = latestCourse?.collegeName || "";
  }

  if ((representative.collegeName || "") === nextCollegeName) {
    return;
  }

  representative.collegeName = nextCollegeName;
  await representative.save(session ? { session } : undefined);
}

export async function createCollegeRequest(req, res, next) {
  try {
    const payload = validateCollegeRequestPayload(req.body);

    if (
      req.user.collegeName &&
      normalizeCollegeName(req.user.collegeName) !== normalizeCollegeName(payload.collegeName)
    ) {
      throw createHttpError(
        `Representatives can only request courses for their assigned college: ${req.user.collegeName}.`,
        403
      );
    }

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

export async function getPublicColleges(req, res, next) {
  try {
    const [userColleges, courseColleges, profileColleges, takenColleges] = await Promise.all([
      User.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
      CollegeCourse.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
      CollegeProfile.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
      User.distinct("collegeNameNormalized", { role: "representative" })
    ]);

    const allColleges = new Set([
      ...userColleges,
      ...courseColleges,
      ...profileColleges
    ].map(c => String(c).trim()).filter(Boolean));

    const takenSet = new Set(takenColleges);

    const data = Array.from(allColleges).sort().map(c => ({
      name: c,
      hasRepresentative: takenSet.has(normalizeCollegeName(c))
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableRepresentativeColleges(req, res, next) {
  try {
    const search = readString(req.query.search, {
      field: "search",
      required: false,
      min: 1,
      max: 120
    });
    const normalizedSearch = search ? normalizeCollegeName(search) : "";
    const courseMatch = normalizedSearch
      ? {
          collegeNameNormalized: {
            $regex: escapeRegex(normalizedSearch),
            $options: "i"
          }
        }
      : {};

    const requestableColleges = await CollegeCourse.aggregate([
      { $match: courseMatch },
      {
        $lookup: {
          from: User.collection.name,
          localField: "addedByRepresentative",
          foreignField: "_id",
          as: "representative"
        }
      },
      {
        $unwind: {
          path: "$representative",
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { collegeName: 1, courseName: 1 } },
      {
        $group: {
          _id: "$collegeNameNormalized",
          collegeName: { $first: "$collegeName" },
          collegeNameNormalized: { $first: "$collegeNameNormalized" },
          courses: {
            $push: {
              courseName: "$courseName",
              semesterCount: "$semesterCount",
              hasActiveRepresentative: {
                $and: [
                  { $eq: ["$representative.role", "representative"] },
                  { $eq: ["$representative.status", "active"] }
                ]
              },
              representativeName: { $ifNull: ["$representative.fullName", ""] },
              representativeStatus: { $ifNull: ["$representative.status", "missing"] }
            }
          }
        }
      },
      { $sort: { collegeName: 1 } }
    ]);

    res.json({ success: true, data: requestableColleges });
  } catch (error) {
    next(error);
  }
}

export async function getRepresentativeRequests(req, res, next) {
  try {
    const requests = await CollegeRequest.find({ representative: req.user.id }).sort({
      createdAt: -1
    }).lean();
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function getPendingRequestsForAdmin(_req, res, next) {
  try {
    const requests = await CollegeRequest.find({ status: "pending" })
      .populate("representative", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function decideCollegeRequest(req, res, next) {
  try {
    const requestId = readMongoId(req.params.requestId, { field: "requestId" });
    const { action, decisionNote } = validateAdminDecisionPayload(req.body);
    const result = await runWithOptionalTransaction(async (session) => {
      const request = await withSession(CollegeRequest.findById(requestId), session);

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
        await request.save(session ? { session } : undefined);
        return { request, approved: null };
      }

      const existingCourse = await withSession(
        CollegeCourse.findOne({
          collegeNameNormalized: request.collegeNameNormalized,
          courseNameNormalized: request.courseNameNormalized
        }),
        session
      );

      if (existingCourse) {
        throw createHttpError(
          "Cannot approve. This college and course already exists in approved records.",
          409
        );
      }

      const [approved] = await CollegeCourse.create(
        [
          {
            collegeName: request.collegeName,
            courseName: request.courseName,
            semesterCount: request.semesterCount,
            addedByRepresentative: request.representative,
            approvedByAdmin: req.user.id
          }
        ],
        session ? { session } : undefined
      );

      request.status = "approved";
      request.decisionNote = decisionNote;
      request.adminDecisionBy = req.user.id;
      await request.save(session ? { session } : undefined);
      await syncRepresentativeCollegeName(request.representative, request.collegeName, session);
      return { request, approved };
    });

    if (action === "reject") {
      await createAuditLog({
        req,
        action: "admin.reject_college_request",
        entityType: "college_request",
        entityId: result.request._id,
        metadata: { collegeName: result.request.collegeName, courseName: result.request.courseName }
      });
      res.json({ success: true, data: result.request });
      return;
    }

    await createAuditLog({
      req,
      action: "admin.approve_college_request",
      entityType: "college_request",
      entityId: result.request._id,
      metadata: { collegeName: result.request.collegeName, courseName: result.request.courseName }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getApprovedCollegeCourses(req, res, next) {
  try {
    const collegeScope = resolveStudentCollegeScope(req, req.query.collegeName, {
      mismatchMessage: "Students can view approved courses only for their assigned college."
    });
    const courseFilters = {};
    if (collegeScope.collegeNameNormalized) {
      courseFilters.collegeNameNormalized = collegeScope.collegeNameNormalized;
    }

    const exposeContactDetails = req.user?.role === "admin";
    const courses = await CollegeCourse.aggregate([
      { $match: courseFilters },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "addedByRepresentative",
          foreignField: "_id",
          as: "addedByRepresentative"
        }
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: "approvedByAdmin",
          foreignField: "_id",
          as: "approvedByAdmin"
        }
      },
      {
        $lookup: {
          from: CollegeProfile.collection.name,
          let: { collegeNameNorm: "$collegeNameNormalized", courseNameNorm: "$courseNameNormalized" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$collegeNameNormalized", "$$collegeNameNorm"] },
                    { $in: ["$courseId", ["$$courseNameNorm", "overall"]] }
                  ]
                }
              }
            },
            {
              $addFields: {
                priority: {
                  $cond: {
                    if: { $eq: ["$courseId", "$$courseNameNorm"] },
                    then: 1,
                    else: 2
                  }
                }
              }
            },
            { $sort: { priority: 1 } },
            { $limit: 1 }
          ],
          as: "profile"
        }
      },
      {
        $unwind: {
          path: "$addedByRepresentative",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$approvedByAdmin",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: "profile.enteredByRepresentative",
          foreignField: "_id",
          as: "profileRepresentative"
        }
      },
      {
        $unwind: {
          path: "$profileRepresentative",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    const data = courses.map((course) => {
      const { profile, profileRepresentative, ...courseData } = course;
      return {
        ...courseData,
        addedByRepresentative: sanitizeGovernancePerson(courseData.addedByRepresentative, exposeContactDetails),
        approvedByAdmin: sanitizeGovernancePerson(courseData.approvedByAdmin, exposeContactDetails),
        profile: profile
          ? {
              ...profile,
              enteredByRepresentative: sanitizeGovernancePerson(
                profileRepresentative,
                exposeContactDetails
              )
            }
          : null
      };
    });

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

    const result = await runWithOptionalTransaction(async (session) => {
      const [course] = await CollegeCourse.create(
        [
          {
            collegeName: payload.collegeName,
            courseName: payload.courseName,
            semesterCount: payload.semesterCount,
            addedByRepresentative: req.user.id,
            approvedByAdmin: req.user.role === "admin" ? req.user.id : null
          }
        ],
        session ? { session } : undefined
      );

      await syncRepresentativeCollegeName(req.user.id, payload.collegeName, session);

      const populatedCourse = await withSession(CollegeCourse.findById(course._id), session)
        .populate("addedByRepresentative", "fullName email")
        .populate("approvedByAdmin", "fullName email");

      return { course, populatedCourse };
    });

    await createAuditLog({
      req,
      action: req.user.role === "admin" ? "admin.create_college_course" : "representative.create_college_course",
      entityType: "college_course",
      entityId: result.course._id,
      metadata: { collegeName: result.course.collegeName, courseName: result.course.courseName }
    });

    res.status(201).json({ success: true, data: result.populatedCourse });
  } catch (error) {
    next(error);
  }
}

export async function getRepresentativeColleges(req, res, next) {
  try {
    const data = await CollegeCourse.aggregate([
      { $match: { addedByRepresentative: readMongoId(req.user.id, { field: "userId" }) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "approvedByAdmin",
          foreignField: "_id",
          as: "approvedByAdmin"
        }
      },
      {
        $lookup: {
          from: CollegeProfile.collection.name,
          let: { collegeNameNorm: "$collegeNameNormalized", courseNameNorm: "$courseNameNormalized" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$collegeNameNormalized", "$$collegeNameNorm"] },
                    { $in: ["$courseId", ["$$courseNameNorm", "overall"]] }
                  ]
                }
              }
            },
            {
              $addFields: {
                priority: {
                  $cond: {
                    if: { $eq: ["$courseId", "$$courseNameNorm"] },
                    then: 1,
                    else: 2
                  }
                }
              }
            },
            { $sort: { priority: 1 } },
            { $limit: 1 }
          ],
          as: "profile"
        }
      },
      {
        $unwind: {
          path: "$approvedByAdmin",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: "profile.enteredByRepresentative",
          foreignField: "_id",
          as: "profileRepresentative"
        }
      },
      {
        $unwind: {
          path: "$profileRepresentative",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    const normalizedData = data.map((course) => {
      const { profile, profileRepresentative, ...courseData } = course;

      return {
        ...courseData,
        profile: profile
        ? {
            ...profile,
            enteredByRepresentative: profileRepresentative || null
          }
        : null
      };
    });

    res.json({ success: true, data: normalizedData });
  } catch (error) {
    next(error);
  }
}

export async function updateApprovedCollegeCourse(req, res, next) {
  try {
    const courseId = readMongoId(req.params.courseId, { field: "courseId" });
    const payload = validateCollegeRequestPayload(req.body);
    const result = await runWithOptionalTransaction(async (session) => {
      const course = await withSession(CollegeCourse.findById(courseId), session);

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

      const conflictingCourse = await withSession(
        CollegeCourse.findOne({
          _id: { $ne: courseId },
          collegeNameNormalized: normalizedCollege,
          courseNameNormalized: normalizedCourse
        }),
        session
      );

      if (conflictingCourse) {
        throw createHttpError("Another approved record already exists for this college and course.", 409);
      }

      const previousCollegeNameNormalized = course.collegeNameNormalized;
      const previousCollegeName = course.collegeName;
      const isCollegeRenamed = previousCollegeNameNormalized !== normalizedCollege;

      if (isCollegeRenamed) {
        const profileExists = await withSession(
          CollegeProfile.exists({
            collegeNameNormalized: previousCollegeNameNormalized,
            enteredByRepresentative: course.addedByRepresentative
          }),
          session
        );

        if (profileExists) {
          const hasOtherCoursesForPreviousCollege = await withSession(
            CollegeCourse.exists({
              _id: { $ne: course._id },
              collegeNameNormalized: previousCollegeNameNormalized,
              addedByRepresentative: course.addedByRepresentative
            }),
            session
          );

          if (hasOtherCoursesForPreviousCollege) {
            throw createHttpError(
              `This college name is shared by other approved courses under ${previousCollegeName}. Update those records first before renaming the college.`,
              409
            );
          }

          const destinationProfileExists = await withSession(
            CollegeProfile.exists({
              collegeNameNormalized: normalizedCollege
            }),
            session
          );

          if (destinationProfileExists) {
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
      await course.save(session ? { session } : undefined);

      if (isCollegeRenamed) {
        await withSession(
          CollegeProfile.updateMany(
            {
              collegeNameNormalized: previousCollegeNameNormalized,
              enteredByRepresentative: course.addedByRepresentative
            },
            {
              $set: {
                collegeName: course.collegeName,
                collegeNameNormalized: normalizedCollege
              }
            }
          ),
          session
        );
      }

      await syncRepresentativeCollegeName(course.addedByRepresentative, course.collegeName, session);

      const updatedCourse = await withSession(CollegeCourse.findById(course._id), session)
      .populate("addedByRepresentative", "fullName email")
      .populate("approvedByAdmin", "fullName email");
      return { course, updatedCourse };
    });

    await createAuditLog({
      req,
      action: "college_course.update",
      entityType: "college_course",
      entityId: result.course._id,
      metadata: { collegeName: result.course.collegeName, courseName: result.course.courseName }
    });

    res.json({ success: true, data: result.updatedCourse });
  } catch (error) {
    next(error);
  }
}

export async function deleteApprovedCollegeCourse(req, res, next) {
  try {
    await requirePasswordConfirmation(req);
    const courseId = readMongoId(req.params.courseId, { field: "courseId" });
    const result = await runWithOptionalTransaction(async (session) => {
      const course = await withSession(CollegeCourse.findById(courseId), session);

      if (!course) {
        throw createHttpError("Approved college course not found.", 404);
      }

      if (
        req.user.role === "representative" &&
        course.addedByRepresentative.toString() !== req.user.id
      ) {
        throw createHttpError("You can delete only your own college details.", 403);
      }

      await withSession(CollegeCourse.findByIdAndDelete(courseId), session);

      const hasOtherCourses = await withSession(
        CollegeCourse.exists({
          collegeNameNormalized: course.collegeNameNormalized,
          addedByRepresentative: course.addedByRepresentative
        }),
        session
      );

      let profileDeleted = false;
      if (!hasOtherCourses) {
        const deleteResult = await withSession(
          CollegeProfile.deleteMany({
            collegeNameNormalized: course.collegeNameNormalized,
            enteredByRepresentative: course.addedByRepresentative
          }),
          session
        );
        profileDeleted = deleteResult.deletedCount > 0;
      } else {
        const deletedProfile = await withSession(
          CollegeProfile.findOneAndDelete({
            collegeNameNormalized: course.collegeNameNormalized,
            courseId: course.courseNameNormalized,
            enteredByRepresentative: course.addedByRepresentative
          }),
          session
        );
        profileDeleted = Boolean(deletedProfile);
      }

      await syncRepresentativeCollegeName(course.addedByRepresentative, "", session);

      return { course, profileDeleted };
    });

    res.json({
      success: true,
      message: result.profileDeleted
        ? "College course and its profile were deleted successfully."
        : "College course deleted successfully."
    });
    await createAuditLog({
      req,
      action: "college_course.delete",
      entityType: "college_course",
      entityId: courseId,
      metadata: {
        profileDeleted: result.profileDeleted,
        collegeName: result.course.collegeName,
        courseName: result.course.courseName
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRepresentativeCollege(req, res, next) {
  try {
    await requirePasswordConfirmation(req);
    const courseId = readMongoId(req.params.courseId, { field: "courseId" });

    const result = await runWithOptionalTransaction(async (session) => {
      const referenceCourse = await withSession(CollegeCourse.findById(courseId), session);

      if (!referenceCourse) {
        throw createHttpError("College course not found.", 404);
      }

      if (
        req.user.role === "representative" &&
        referenceCourse.addedByRepresentative.toString() !== req.user.id
      ) {
        throw createHttpError("You can delete only colleges created under your own account.", 403);
      }

      if (req.user.role === "representative") {
        const otherOwnersExist = await withSession(
          CollegeCourse.exists({
            collegeNameNormalized: referenceCourse.collegeNameNormalized,
            addedByRepresentative: { $ne: req.user.id }
          }),
          session
        );

        if (otherOwnersExist) {
          throw createHttpError(
            "This college also has course records owned by another account. Delete only your course entries, or ask admin to review the college.",
            409
          );
        }
      }

      const ownedCourses = await withSession(
        CollegeCourse.find({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(req.user.role === "representative"
            ? { addedByRepresentative: req.user.id }
            : {})
        }),
        session
      );

      const programKeys = [
        ...new Set(
          ownedCourses.map((course) => normalizeCourseAccessKey(course.courseName))
        )
      ];
      const courseIds = ownedCourses.map((course) => course._id);

      const resourceFilters = {
        collegeName: new RegExp(`^${referenceCourse.collegeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        ...(req.user.role === "representative" ? { uploadedBy: req.user.id } : {})
      };
      if (programKeys.length) {
        resourceFilters.programId = { $in: programKeys };
      }

      const resources = await withSession(
        Resource.find(resourceFilters).select(
          "_id storageProvider fileStoredName cloudObjectKey"
        ),
        session
      );

      await Promise.all(
        resources.map((resource) => removeStoredFile(resource))
      );

      await withSession(
        Resource.deleteMany({ _id: { $in: resources.map((resource) => resource._id) } }),
        session
      );

      await withSession(
        Quiz.deleteMany({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(programKeys.length ? { programId: { $in: programKeys } } : {}),
          ...(req.user.role === "representative" ? { createdByUser: req.user.id } : {})
        }),
        session
      );

      await withSession(
        Notice.deleteMany({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(req.user.role === "representative" ? { createdByAdmin: req.user.id } : {})
        }),
        session
      );

      await withSession(
        AcademicSubject.deleteMany({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(programKeys.length ? { programId: { $in: programKeys } } : {}),
          ...(req.user.role === "representative" ? { createdByAdmin: req.user.id } : {})
        }),
        session
      );

      await withSession(
        AcademicStructure.deleteMany({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(programKeys.length ? { programId: { $in: programKeys } } : {}),
          ...(req.user.role === "representative" ? { createdByAdmin: req.user.id } : {})
        }),
        session
      );

      await withSession(
        CollegeProfile.deleteOne({
          collegeNameNormalized: referenceCourse.collegeNameNormalized,
          ...(req.user.role === "representative"
            ? { enteredByRepresentative: req.user.id }
            : {})
        }),
        session
      );

      await withSession(
        CollegeCourse.deleteMany({
          _id: { $in: courseIds }
        }),
        session
      );

      if (req.user.role === "representative") {
        await syncRepresentativeCollegeName(req.user.id, "", session);
      }

      return {
        collegeName: referenceCourse.collegeName,
        deletedCourseCount: courseIds.length,
        deletedResourceCount: resources.length
      };
    });

    await createAuditLog({
      req,
      action: `${req.user.role}.delete_college_bundle`,
      entityType: "college",
      entityId: courseId,
      metadata: result
    });

    res.json({
      success: true,
      message: `College ${result.collegeName} deleted successfully from your managed records.`
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertCollegeProfile(req, res, next) {
  try {
    const payload = validateCollegeProfilePayload(req.body);
    const normalizedCollege = normalizeCollegeName(payload.collegeName);
    const existingProfile = await CollegeProfile.findOne({
      collegeNameNormalized: normalizedCollege,
      courseId: payload.courseId
    });

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

      if (
        existingProfile &&
        existingProfile.enteredByRepresentative.toString() !== req.user.id
      ) {
        throw createHttpError(
          "This college profile is already managed by another representative. Admin must reassign it before you can edit.",
          409
        );
      }
    }

    let profile;

    if (existingProfile) {
      Object.assign(existingProfile, payload, {
        enteredByRepresentative: existingProfile.enteredByRepresentative
      });
      await existingProfile.save();
      profile = await CollegeProfile.findById(existingProfile._id).populate(
        "enteredByRepresentative",
        "fullName email"
      );
    } else {
      profile = await CollegeProfile.create({
        ...payload,
        enteredByRepresentative: req.user.id
      });
      profile = await CollegeProfile.findById(profile._id).populate(
        "enteredByRepresentative",
        "fullName email"
      );
    }
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
    await requirePasswordConfirmation(req);
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
    const requestedCollegeName =
      req.user?.role === "student"
        ? req.query.collegeName
        : readString(req.query.collegeName, {
            field: "collegeName",
            min: 3,
            max: 120
          });
    const collegeScope = resolveStudentCollegeScope(req, requestedCollegeName, {
      mismatchMessage: "Students can view college profile only for their assigned college."
    });
    const courseId = req.query.courseId?.toString().trim() || "overall";
    const profile = await CollegeProfile.findOne({
      collegeNameNormalized: collegeScope.collegeNameNormalized,
      courseId
    }).populate("enteredByRepresentative", "fullName email").lean();

    if (!profile) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}
