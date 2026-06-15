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

    const threads = await CommunityThread.find(filters).populate("createdBy", "fullName").sort("-createdAt");
    res.json({ success: true, data: threads });
  } catch (error) {
    next(error);
  }
}

export async function getThreadById(req, res, next) {
  try {
    const thread = await CommunityThread.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("replies.author", "fullName email");

    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    res.json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
}

export async function replyToThread(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const thread = await CommunityThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    thread.replies.push({
      message,
      author: req.user.id,
      createdAt: new Date()
    });

    await thread.save();

    res.status(201).json({ success: true, message: "Reply posted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function deleteThread(req, res, next) {
  try {
    const thread = await CommunityThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    if (thread.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this thread" });
    }

    await thread.deleteOne();
    res.json({ success: true, message: "Thread deleted successfully" });
  } catch (error) {
    next(error);
  }
}
