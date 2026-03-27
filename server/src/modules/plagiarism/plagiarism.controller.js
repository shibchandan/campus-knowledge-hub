import { PlagiarismRecord } from "./plagiarism.model.js";

export async function createPlagiarismRecord(req, res, next) {
  try {
    const record = await PlagiarismRecord.create({
      ...req.body,
      contributor: req.body.contributor || req.user.id
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

export async function getPlagiarismRecords(_req, res, next) {
  try {
    const records = await PlagiarismRecord.find().populate("contributor", "fullName email");
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}
