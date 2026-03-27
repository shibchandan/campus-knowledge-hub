import mongoose from "mongoose";

const academicStructureSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    collegeNameNormalized: { type: String, required: true, trim: true },
    programId: { type: String, required: true, trim: true },
    programName: { type: String, required: true, trim: true },
    branchId: { type: String, required: true, trim: true },
    branchName: { type: String, required: true, trim: true },
    branchDescription: { type: String, default: "", trim: true },
    semesterId: { type: String, required: true, trim: true },
    semesterName: { type: String, required: true, trim: true },
    semesterOrder: { type: Number, required: true, min: 1, max: 20 },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

academicStructureSchema.index(
  {
    collegeNameNormalized: 1,
    programId: 1,
    branchId: 1,
    semesterId: 1
  },
  { unique: true, name: "uniq_academic_structure_semester" }
);

academicStructureSchema.index(
  {
    collegeNameNormalized: 1,
    programId: 1,
    branchId: 1,
    semesterOrder: 1
  },
  { name: "idx_academic_structure_branch_semesters" }
);

academicStructureSchema.index(
  {
    collegeNameNormalized: 1,
    programId: 1,
    branchId: 1
  },
  { name: "idx_academic_structure_program_branches" }
);

export const AcademicStructure = mongoose.model("AcademicStructure", academicStructureSchema);
