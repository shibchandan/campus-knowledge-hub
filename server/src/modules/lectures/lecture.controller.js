import { Lecture } from "./lecture.model.js";

export async function createLecture(req, res, next) {
  try {
    const lecture = await Lecture.create({
      ...req.body,
      professor: req.user.id
    });

    res.status(201).json({ success: true, data: lecture });
  } catch (error) {
    next(error);
  }
}

export async function getLectures(req, res, next) {
  try {
    const filters = {};
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.semester) filters.semester = req.query.semester;

    const lectures = await Lecture.find(filters).populate("professor", "fullName email role");
    res.json({ success: true, data: lectures });
  } catch (error) {
    next(error);
  }
}
