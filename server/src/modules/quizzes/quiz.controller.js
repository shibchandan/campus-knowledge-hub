import { Quiz } from "./quiz.model.js";
import { CollegeCourse } from "../governance/governance.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";

function readBoolean(value, defaultValue = true) {
  if (value === undefined) {
    return defaultValue;
  }

  return String(value).trim().toLowerCase() === "true";
}

function validateQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw createHttpError("At least one quiz question is required.");
  }

  return rawQuestions.map((question, index) => {
    const prompt = readString(question?.prompt, {
      field: `Question ${index + 1} prompt`,
      min: 5,
      max: 300
    });
    const options = Array.isArray(question?.options)
      ? question.options
          .map((option, optionIndex) =>
            readString(option, {
              field: `Question ${index + 1} option ${optionIndex + 1}`,
              min: 1,
              max: 120
            })
          )
      : [];

    if (options.length < 2) {
      throw createHttpError(`Question ${index + 1} must have at least two options.`);
    }

    const answer = readString(question?.answer, {
      field: `Question ${index + 1} answer`,
      min: 1,
      max: 120
    });

    if (!options.includes(answer)) {
      throw createHttpError(`Question ${index + 1} answer must match one of the options.`);
    }

    return { prompt, options, answer };
  });
}

function validateQuizPayload(body) {
  const collegeName = readString(body.collegeName, {
    field: "collegeName",
    min: 3,
    max: 120
  });

  return {
    collegeName,
    collegeNameNormalized: normalizeCollegeName(collegeName),
    title: readString(body.title, { field: "title", min: 3, max: 160 }),
    duration: readString(body.duration, { field: "duration", min: 2, max: 40 }),
    difficulty: readString(body.difficulty, { field: "difficulty", min: 2, max: 40 }),
    mode: readString(body.mode, { field: "mode", min: 2, max: 80 }),
    note: readString(body.note, { field: "note", required: false, max: 300 }),
    resourceMatch: readString(body.resourceMatch, {
      field: "resourceMatch",
      required: false,
      max: 160
    }),
    questions: validateQuestions(body.questions),
    isPublished: readBoolean(body.isPublished, true)
  };
}

async function assertRepresentativeCollegeAccess(user, collegeNameNormalized) {
  if (user.role !== "representative") {
    return;
  }

  const approvedCourse = await CollegeCourse.findOne({
    collegeNameNormalized,
    addedByRepresentative: user.id
  });

  if (!approvedCourse) {
    throw createHttpError(
      "Representative can manage quizzes only for approved colleges assigned to them.",
      403
    );
  }
}

export async function listQuizzes(req, res, next) {
  try {
    const filters = {};
    const collegeName = readString(req.query.collegeName, {
      field: "collegeName",
      required: false,
      min: 3,
      max: 120
    });

    if (req.user.role === "student") {
      if (!req.user.collegeName) {
        throw createHttpError(
          "Your student account is not assigned to a college yet. Ask admin to assign your college.",
          403
        );
      }

      if (collegeName && normalizeCollegeName(collegeName) !== normalizeCollegeName(req.user.collegeName)) {
        throw createHttpError("Students can view quizzes only for their assigned college.", 403);
      }
    }

    if (req.query.includeUnpublished === "true") {
      if (req.user.role === "representative") {
        if (!collegeName) {
          throw createHttpError("collegeName is required to view your unpublished quizzes.");
        }

        const normalizedCollege = normalizeCollegeName(collegeName);
        await assertRepresentativeCollegeAccess(req.user, normalizedCollege);
        filters.collegeNameNormalized = normalizedCollege;
      }
    } else {
      filters.isPublished = true;
      const effectiveCollegeName =
        req.user.role === "student" ? req.user.collegeName : collegeName;
      if (effectiveCollegeName) {
        filters.collegeNameNormalized = normalizeCollegeName(effectiveCollegeName);
      }
    }

    const quizzes = await Quiz.find(filters)
      .populate("createdByUser", "fullName email role")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
}

export async function getQuizById(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const collegeName = readString(req.query.collegeName, {
      field: "collegeName",
      required: false,
      min: 3,
      max: 120
    });
    const quiz = await Quiz.findById(quizId).populate("createdByUser", "fullName email role");

    if (!quiz) {
      throw createHttpError("Quiz arrangement not found.", 404);
    }

    if (!collegeName) {
      throw createHttpError("collegeName is required to access a quiz.", 400);
    }

    if (quiz.collegeNameNormalized !== normalizeCollegeName(collegeName)) {
      throw createHttpError("This quiz does not belong to the selected college.", 403);
    }

    if (
      req.user.role === "student" &&
      (!req.user.collegeName ||
        normalizeCollegeName(req.user.collegeName) !== quiz.collegeNameNormalized)
    ) {
      throw createHttpError("Students can access quizzes only for their assigned college.", 403);
    }

    if (!quiz.isPublished) {
      const isAdmin = req.user.role === "admin";
      const isOwner = String(quiz.createdByUser?._id || quiz.createdByUser) === String(req.user.id);
      if (!isAdmin && !isOwner) {
        throw createHttpError("You are not allowed to view this quiz.", 403);
      }
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
}

export async function createQuiz(req, res, next) {
  try {
    const payload = validateQuizPayload(req.body);
    await assertRepresentativeCollegeAccess(req.user, payload.collegeNameNormalized);

    const quiz = await Quiz.create({
      ...payload,
      createdByUser: req.user.id
    });

    await createAuditLog({
      req,
      action: `${req.user.role}.create_quiz`,
      entityType: "quiz",
      entityId: quiz._id,
      metadata: { collegeName: quiz.collegeName, title: quiz.title }
    });

    const populated = await Quiz.findById(quiz._id).populate("createdByUser", "fullName email role");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function updateQuiz(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw createHttpError("Quiz arrangement not found.", 404);
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(quiz.createdByUser) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      throw createHttpError("You are not allowed to edit this quiz.", 403);
    }

    const payload = validateQuizPayload(req.body);
    await assertRepresentativeCollegeAccess(req.user, payload.collegeNameNormalized);

    Object.assign(quiz, payload);
    await quiz.save();

    await createAuditLog({
      req,
      action: `${req.user.role}.update_quiz`,
      entityType: "quiz",
      entityId: quiz._id,
      metadata: { collegeName: quiz.collegeName, title: quiz.title }
    });

    const populated = await Quiz.findById(quiz._id).populate("createdByUser", "fullName email role");
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw createHttpError("Quiz arrangement not found.", 404);
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(quiz.createdByUser) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      throw createHttpError("You are not allowed to delete this quiz.", 403);
    }

    await quiz.deleteOne();
    await createAuditLog({
      req,
      action: `${req.user.role}.delete_quiz`,
      entityType: "quiz",
      entityId: quiz._id,
      metadata: { collegeName: quiz.collegeName, title: quiz.title }
    });

    res.json({ success: true, message: "Quiz arrangement deleted successfully." });
  } catch (error) {
    next(error);
  }
}
