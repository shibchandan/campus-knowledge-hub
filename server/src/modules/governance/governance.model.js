import mongoose from "mongoose";

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const collegeCourseSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    semesterCount: { type: Number, default: null, min: 1, max: 12 },
    addedByRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    approvedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    collegeNameNormalized: { type: String, required: true },
    courseNameNormalized: { type: String, required: true }
  },
  { timestamps: true }
);

collegeCourseSchema.index(
  { collegeNameNormalized: 1, courseNameNormalized: 1 },
  { unique: true, name: "uniq_college_course" }
);
collegeCourseSchema.index(
  { addedByRepresentative: 1, createdAt: -1 },
  { name: "idx_college_course_by_representative" }
);
collegeCourseSchema.index(
  { addedByRepresentative: 1, updatedAt: -1, createdAt: -1 },
  { name: "idx_college_course_by_representative_recent" }
);
collegeCourseSchema.index(
  { collegeNameNormalized: 1, addedByRepresentative: 1 },
  { name: "idx_college_course_by_college_rep" }
);
collegeCourseSchema.index(
  { collegeNameNormalized: 1, createdAt: -1 },
  { name: "idx_college_course_by_college_created" }
);

collegeCourseSchema.pre("validate", function normalizeKeys(next) {
  if (this.collegeName) {
    this.collegeNameNormalized = normalize(this.collegeName);
  }

  if (this.courseName) {
    this.courseNameNormalized = normalize(this.courseName);
  }

  next();
});

const collegeRequestSchema = new mongoose.Schema(
  {
    representative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    collegeName: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    semesterCount: { type: Number, default: null, min: 1, max: 12 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    adminDecisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    decisionNote: { type: String, default: "" },
    collegeNameNormalized: { type: String, required: true },
    courseNameNormalized: { type: String, required: true }
  },
  { timestamps: true }
);

const collegeProfileSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    collegeNameNormalized: { type: String, required: true },
    courseId: { type: String, default: "overall", trim: true },
    location: { type: String, default: "", trim: true },
    enteredByRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    entranceExams: [{ type: String, trim: true }],
    rankings: {
      nirf: { type: String, default: "" },
      qs: { type: String, default: "" },
      other: { type: String, default: "" }
    },
    cutOffSummary: { type: String, default: "" },
    placementReport: { type: String, default: "" },
    placementReportUrl: { type: String, default: "" },
    averagePackageLpa: { type: String, default: "" },
    highestPackageLpa: { type: String, default: "" },
    cutOffList: [
      {
        branch: { type: String, trim: true },
        value: { type: String, trim: true }
      }
    ],
    placementList: [
      {
        branch: { type: String, trim: true },
        value: { type: String, trim: true }
      }
    ]
  },
  { timestamps: true }
);
collegeProfileSchema.index(
  { collegeNameNormalized: 1, courseId: 1 },
  { unique: true, name: "uniq_college_profile_course" }
);
collegeProfileSchema.index(
  { enteredByRepresentative: 1, createdAt: -1 },
  { name: "idx_college_profile_by_representative" }
);

collegeProfileSchema.pre("validate", function normalizeKeys(next) {
  if (this.collegeName) {
    this.collegeNameNormalized = normalize(this.collegeName);
  }
  next();
});

collegeRequestSchema.pre("validate", function normalizeKeys(next) {
  if (this.collegeName) {
    this.collegeNameNormalized = normalize(this.collegeName);
  }

  if (this.courseName) {
    this.courseNameNormalized = normalize(this.courseName);
  }

  next();
});

collegeRequestSchema.index(
  { representative: 1, createdAt: -1 },
  { name: "idx_college_request_by_representative" }
);
collegeRequestSchema.index(
  { status: 1, createdAt: -1 },
  { name: "idx_college_request_by_status" }
);
collegeRequestSchema.index(
  { collegeNameNormalized: 1, courseNameNormalized: 1, status: 1 },
  { name: "idx_college_request_conflict_check" }
);

export const CollegeCourse = mongoose.model("CollegeCourse", collegeCourseSchema);
export const CollegeRequest = mongoose.model("CollegeRequest", collegeRequestSchema);
export const CollegeProfile = mongoose.model("CollegeProfile", collegeProfileSchema);
