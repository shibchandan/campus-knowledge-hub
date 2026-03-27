import { CommunityThread } from "./community.model.js";

export async function createThread(req, res, next) {
  try {
    const thread = await CommunityThread.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
}

export async function getThreads(req, res, next) {
  try {
    const filters = {};
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.semester) filters.semester = req.query.semester;
    if (req.query.channelType) filters.channelType = req.query.channelType;

    const threads = await CommunityThread.find(filters).populate("createdBy", "fullName");
    res.json({ success: true, data: threads });
  } catch (error) {
    next(error);
  }
}
