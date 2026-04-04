import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["student", "representative", "admin"], default: "student" },
    representativeRequestStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none"
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active"
    },
    collegeName: { type: String, default: "", trim: true },
    collegeStudentId: { type: String, default: "", trim: true },
    officialCollegeEmail: { type: String, default: "", lowercase: true, trim: true },
    officialCollegeEmailVerified: { type: Boolean, default: false },
    studentVerificationStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none"
    },
    studentProofOriginalName: { type: String, default: "" },
    studentProofStoredName: { type: String, default: "" },
    studentProofMimeType: { type: String, default: "" },
    studentProofUrl: { type: String, default: "" },
    collegeEmailOtpHash: { type: String, default: "", select: false },
    collegeEmailOtpExpiresAt: { type: Date, default: null, select: false },
    collegeEmailOtpSentAt: { type: Date, default: null, select: false },
    avatarUrl: { type: String, default: "" },
    reputationScore: { type: Number, default: 0 },
    passwordResetOtpHash: { type: String, default: "", select: false },
    passwordResetOtpExpiresAt: { type: Date, default: null, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetOtpSentAt: { type: Date, default: null, select: false },
    passwordResetLockedUntil: { type: Date, default: null, select: false },
    passwordResetVerifiedAt: { type: Date, default: null, select: false }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1, createdAt: -1 }, { name: "idx_user_role_status_created" });
userSchema.index({ status: 1, createdAt: -1 }, { name: "idx_user_status_created" });
userSchema.index(
  { studentVerificationStatus: 1, collegeName: 1, createdAt: -1 },
  { name: "idx_user_student_verification_college_created" }
);
userSchema.index(
  { representativeRequestStatus: 1, createdAt: -1 },
  { name: "idx_user_rep_request_status_created" }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    collegeName: this.collegeName || "",
    collegeStudentId: this.collegeStudentId || "",
    officialCollegeEmail: this.officialCollegeEmail || "",
    officialCollegeEmailVerified: Boolean(this.officialCollegeEmailVerified),
    studentVerificationStatus: this.studentVerificationStatus || "none",
    studentProofUrl: this.studentProofUrl || "",
    studentProofOriginalName: this.studentProofOriginalName || "",
    representativeRequestStatus: this.representativeRequestStatus || "none",
    status: this.status || "active",
    avatarUrl: this.avatarUrl,
    reputationScore: this.reputationScore,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const User = mongoose.model("User", userSchema);
