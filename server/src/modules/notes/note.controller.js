import { Note } from "./note.model.js";

export async function createNote(req, res, next) {
  try {
    const note = await Note.create({
      ...req.body,
      uploadedBy: req.user.id
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
}

export async function getNotes(req, res, next) {
  try {
    const filters = {};
    if (req.query.course) filters.course = req.query.course;
    if (req.query.semester) filters.semester = req.query.semester;
    if (req.query.type) filters.type = req.query.type;

    const notes = await Note.find(filters).populate("uploadedBy", "fullName email role");
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
}
