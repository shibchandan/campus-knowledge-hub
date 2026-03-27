import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    label: String,
    seconds: Number,
    note: String
  },
  { _id: false }
);

const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    lectureDate: { type: Date, required: true },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoUrl: { type: String, required: true },
    transcript: { type: String, default: "" },
    allowDownload: { type: Boolean, default: false },
    bookmarks: [bookmarkSchema]
  },
  { timestamps: true }
);

export const Lecture = mongoose.model("Lecture", lectureSchema);
