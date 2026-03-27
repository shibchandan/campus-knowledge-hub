import mongoose from "mongoose";

const noteVersionSchema = new mongoose.Schema(
  {
    versionLabel: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["notes", "ppt", "book", "pyq", "solution"], required: true },
    course: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    professorName: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    versions: [noteVersionSchema],
    tags: [String],
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);
