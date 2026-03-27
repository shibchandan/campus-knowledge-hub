import mongoose from "mongoose";

const academicSubjectSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    collegeNameNormalized: { type: String, required: true, trim: true },
    programId: { type: String, required: true, trim: true },
    branchId: { type: String, required: true, trim: true },
    semesterId: { type: String, required: true, trim: true },
    subjectId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

academicSubjectSchema.index(
  {
    collegeNameNormalized: 1,
    programId: 1,
    branchId: 1,
    semesterId: 1,
    subjectId: 1
  },
  { unique: true, name: "uniq_academic_subject" }
);
academicSubjectSchema.index(
  {
    collegeNameNormalized: 1,
    programId: 1,
    branchId: 1,
    semesterId: 1,
    createdAt: 1
  },
  { name: "idx_academic_subject_listing" }
);

export const AcademicSubject = mongoose.model("AcademicSubject", academicSubjectSchema);
