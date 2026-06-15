import { Quiz, QuizResult } from "./quiz.model.js";
import { CollegeCourse } from "../governance/governance.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  collegeNameMatches,
  normalizeCourseAccessKey,
  requireStudentAssignedCollege,
  resolveStudentCollegeScope
} from "../../utils/studentCollegeAccess.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";
import { requirePasswordConfirmation } from "../../utils/passwordConfirmation.js";

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
    programId: readString(body.programId, { field: "programId", min: 2, max: 80 }),
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
    accessPassword: body.accessPassword
      ? readString(body.accessPassword, { field: "accessPassword", min: 4, max: 20 })
      : Math.floor(100000 + Math.random() * 900000).toString(),
    timerMinutes: body.timerMinutes ? Number(body.timerMinutes) : 0,
    questions: validateQuestions(body.questions),
    isPublished: readBoolean(body.isPublished, true)
  };
}

async function assertRepresentativeCollegeAccess(user, collegeNameNormalized, programId) {
  if (user.role !== "representative") {
    return;
  }

  if (collegeNameMatches(user.collegeName, collegeNameNormalized)) {
    return;
  }

  const approvedCourses = await CollegeCourse.find({
    collegeNameNormalized,
    addedByRepresentative: user.id
  }).select("courseName");

  const targetProgram = normalizeCourseAccessKey(programId);
  const hasMatch = approvedCourses.some(
    (course) => normalizeCourseAccessKey(course.courseName) === targetProgram
  );

  if (!hasMatch) {
    throw createHttpError(
      "Representative can manage quizzes only for their directly assigned college or approved college courses assigned to them.",
      403
    );
  }
}

export async function listQuizzes(req, res, next) {
  try {
    const filters = {};
    const collegeScope = resolveStudentCollegeScope(req, req.query.collegeName, {
      fieldName: "collegeName"
    });
    const collegeName = collegeScope.collegeName;

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req);
    }

    if (req.query.includeUnpublished === "true") {
      if (req.user.role === "representative") {
        if (!collegeName) {
          throw createHttpError("collegeName is required to view your unpublished quizzes.");
        }

        const normalizedCollege = normalizeCollegeName(collegeName);
        const programId = readString(req.query.programId, {
          field: "programId",
          required: false,
          min: 2,
          max: 80
        });

        if (!programId) {
          throw createHttpError("programId is required to view your unpublished quizzes.");
        }

        await assertRepresentativeCollegeAccess(req.user, normalizedCollege, programId);
        filters.collegeNameNormalized = normalizedCollege;
        filters.programId = programId;
      }
    } else {
      filters.isPublished = true;
      filters.isEnded = { $ne: true };
      const effectiveCollegeName =
        req.user.role === "student" ? req.user.collegeName : collegeName;
      if (effectiveCollegeName) {
        filters.collegeNameNormalized = normalizeCollegeName(effectiveCollegeName);
      }
    }

    const quizzes = await Quiz.find(filters)
      .populate("createdByUser", "fullName role")
      .sort({ createdAt: -1 });

    const formattedQuizzes = quizzes.map(q => {
      const obj = q.toObject();
      if (req.user.role === "student") {
        obj.questionsCount = obj.questions?.length || 0;
        delete obj.questions;
      }
      return obj;
    });

    res.json({ success: true, data: formattedQuizzes });
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
    const quiz = await Quiz.findById(quizId).populate("createdByUser", "fullName role");

    if (!quiz) {
      throw createHttpError("Quiz arrangement not found.", 404);
    }

    if (!collegeName) {
      throw createHttpError("collegeName is required to access a quiz.", 400);
    }

    if (quiz.collegeNameNormalized !== normalizeCollegeName(collegeName)) {
      throw createHttpError("This quiz does not belong to the selected college.", 403);
    }

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req);
    }

    if (
      req.user.role === "student" &&
      normalizeCollegeName(req.user.collegeName) !== quiz.collegeNameNormalized
    ) {
      throw createHttpError("Students can access quizzes only for their assigned college.", 403);
    }

    if (quiz.isEnded && req.user.role === "student") {
      throw createHttpError("This quiz has ended and is no longer available.", 403);
    }

    if (!quiz.isPublished) {
      const isAdmin = req.user.role === "admin";
      const isOwner = String(quiz.createdByUser?._id || quiz.createdByUser) === String(req.user.id);
      if (!isAdmin && !isOwner) {
        throw createHttpError("You are not allowed to view this quiz.", 403);
      }
    }

    const quizObj = quiz.toObject();
    if (req.user.role === "student") {
      quizObj.questionsCount = quizObj.questions?.length || 0;
      delete quizObj.questions;
    }

    res.json({ success: true, data: quizObj });
  } catch (error) {
    next(error);
  }
}

export async function createQuiz(req, res, next) {
  try {
    const payload = validateQuizPayload(req.body);
    await assertRepresentativeCollegeAccess(req.user, payload.collegeNameNormalized, payload.programId);

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

    const populated = await Quiz.findById(quiz._id).select("+accessPassword").populate("createdByUser", "fullName role");
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
    await assertRepresentativeCollegeAccess(req.user, payload.collegeNameNormalized, payload.programId);

    Object.assign(quiz, payload);
    await quiz.save();

    await createAuditLog({
      req,
      action: `${req.user.role}.update_quiz`,
      entityType: "quiz",
      entityId: quiz._id,
      metadata: { collegeName: quiz.collegeName, title: quiz.title }
    });

    const populated = await Quiz.findById(quiz._id).populate("createdByUser", "fullName role");
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    await requirePasswordConfirmation(req);
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

export async function startQuiz(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const accessPassword = readString(req.body.accessPassword, { field: "accessPassword" });

    const quiz = await Quiz.findById(quizId).select("+accessPassword");

    if (!quiz) {
      throw createHttpError("Quiz not found.", 404);
    }

    if (!quiz.isPublished) {
      throw createHttpError("Quiz is not published.", 403);
    }

    if (quiz.isEnded) {
      throw createHttpError("This quiz has ended and is no longer available.", 403);
    }

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req);
      if (normalizeCollegeName(req.user.collegeName) !== quiz.collegeNameNormalized) {
        throw createHttpError("Students can access quizzes only for their assigned college.", 403);
      }
    }

    if (quiz.accessPassword && quiz.accessPassword !== accessPassword) {
      throw createHttpError("Invalid quiz PIN.", 401);
    }

    // We can just return the quiz (with questions intact)
    // The frontend will now have the questions to render the active quiz
    const quizObj = quiz.toObject();
    delete quizObj.accessPassword;

    res.json({ success: true, data: quizObj });
  } catch (error) {
    next(error);
  }
}

export async function endQuiz(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw createHttpError("Quiz arrangement not found.", 404);
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(quiz.createdByUser) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      throw createHttpError("You are not allowed to end this quiz.", 403);
    }

    quiz.isEnded = true;
    await quiz.save();

    await createAuditLog({
      req,
      action: `${req.user.role}.end_quiz`,
      entityType: "quiz",
      entityId: quiz._id,
      metadata: { collegeName: quiz.collegeName, title: quiz.title }
    });

    const populated = await Quiz.findById(quiz._id).populate("createdByUser", "fullName role");
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw createHttpError("Quiz not found.", 404);
    }

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req);
      if (normalizeCollegeName(req.user.collegeName) !== quiz.collegeNameNormalized) {
        throw createHttpError("Students can access quizzes only for their assigned college.", 403);
      }
    }

    const { studentName, collegeId, selectedAnswers } = req.body;

    const validatedStudentName = readString(studentName, { field: "studentName", min: 2, max: 120 });
    const validatedCollegeId = readString(collegeId, { field: "collegeId", min: 2, max: 60 });

    if (!selectedAnswers || typeof selectedAnswers !== "object") {
      throw createHttpError("Invalid answers format.", 400);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((question, index) => {
      const chosen = selectedAnswers[index];
      if (!chosen) {
        unattemptedCount++;
      } else if (chosen === question.answer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const result = await QuizResult.create({
      quizId: quiz._id,
      studentId: req.user.id,
      studentName: validatedStudentName,
      collegeId: validatedCollegeId,
      correctCount,
      wrongCount,
      unattemptedCount,
      totalQuestions
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizResults(req, res, next) {
  try {
    const quizId = readMongoId(req.params.quizId, { field: "quizId" });
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw createHttpError("Quiz not found.", 404);
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(quiz.createdByUser) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      throw createHttpError("You are not allowed to view results for this quiz.", 403);
    }

    const results = await QuizResult.find({ quizId: quiz._id }).sort({ correctCount: -1, createdAt: 1 });
    
    // We send back both the quiz metadata and the results
    const quizObj = quiz.toObject();
    delete quizObj.questions;
    delete quizObj.accessPassword;

    res.json({
      success: true,
      data: {
        quiz: quizObj,
        results
      }
    });
  } catch (error) {
    next(error);
  }
}
