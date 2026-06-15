import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    answer: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    collegeNameNormalized: { type: String, required: true, trim: true },
    programId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    difficulty: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    resourceMatch: { type: String, default: "", trim: true },
    accessPassword: { type: String, select: false },
    timerMinutes: { type: Number, default: 0 },
    questions: { type: [quizQuestionSchema], default: [] },
    isPublished: { type: Boolean, default: true },
    isEnded: { type: Boolean, default: false },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

quizSchema.index(
  { collegeNameNormalized: 1, programId: 1, isPublished: 1, createdAt: -1 },
  { name: "idx_quiz_by_college" }
);
quizSchema.index(
  { createdByUser: 1, createdAt: -1 },
  { name: "idx_quiz_by_creator" }
);

export const Quiz = mongoose.model("Quiz", quizSchema);

const quizResultSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true, trim: true },
    collegeId: { type: String, required: true, trim: true },
    correctCount: { type: Number, required: true },
    wrongCount: { type: Number, required: true },
    unattemptedCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true }
  },
  { timestamps: true }
);

quizResultSchema.index(
  { quizId: 1, correctCount: -1 },
  { name: "idx_quizresult_by_quiz" }
);

export const QuizResult = mongoose.model("QuizResult", quizResultSchema);
