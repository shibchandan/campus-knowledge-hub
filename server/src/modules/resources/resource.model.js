import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    collegeName: { type: String, required: true, trim: true },
    programId: { type: String, required: true, trim: true },
    branchId: { type: String, required: true, trim: true },
    semesterId: { type: String, required: true, trim: true },
    subjectId: { type: String, required: true, trim: true },
    categoryId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    textContent: { type: String, default: "" },
    fileOriginalName: { type: String, default: "" },
    fileStoredName: { type: String, default: "" },
    fileMimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    storageProvider: { type: String, default: "local" },
    fileUrl: { type: String, default: "" },
    previewUrl: { type: String, default: "" },
    cloudObjectKey: { type: String, default: "" },
    visibility: {
      type: String,
      enum: ["personal", "private", "protected", "public"],
      default: "private"
    },
    accessPrice: { type: Number, min: 0, default: 0 },
    allowBasicSubscription: { type: Boolean, default: false },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

resourceSchema.index({
  collegeName: 1,
  programId: 1,
  branchId: 1,
  semesterId: 1,
  subjectId: 1,
  categoryId: 1
});
resourceSchema.index(
  {
    collegeName: 1,
    programId: 1,
    branchId: 1,
    semesterId: 1,
    subjectId: 1,
    categoryId: 1,
    createdAt: -1
  },
  { name: "idx_resource_academic_listing" }
);
resourceSchema.index(
  { uploadedBy: 1, createdAt: -1 },
  { name: "idx_resource_by_uploader" }
);
resourceSchema.index(
  { visibility: 1, collegeName: 1, createdAt: -1 },
  { name: "idx_resource_visibility_college_created" }
);

export const Resource = mongoose.model("Resource", resourceSchema);
