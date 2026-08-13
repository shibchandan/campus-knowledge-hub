import crypto from "crypto";
import { LiveClass } from "./liveClass.model.js";

export async function createLiveClass(req, res, next) {
  try {
    const roomId = crypto.randomBytes(8).toString("hex");
    const roomName = `campus-hub-${roomId}`;

    const liveClass = await LiveClass.create({
      ...req.body,
      host: req.user.id,
      roomName
    });

    res.status(201).json({ success: true, data: liveClass });
  } catch (error) {
    next(error);
  }
}

export async function getLiveClasses(req, res, next) {
  try {
    const filters = {};
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.semester) filters.semester = req.query.semester;
    if (req.query.status) filters.status = req.query.status;

    const liveClasses = await LiveClass.find(filters)
      .populate("host", "fullName role")
      .sort({ scheduledAt: -1 });

    res.json({ success: true, data: liveClasses });
  } catch (error) {
    next(error);
  }
}

export async function updateLiveClass(req, res, next) {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    if (liveClass.host.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this live class" });
    }

    const updated = await LiveClass.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("host", "fullName role");

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteLiveClass(req, res, next) {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    if (liveClass.host.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this live class" });
    }

    await liveClass.deleteOne();
    res.json({ success: true, message: "Live class deleted successfully" });
  } catch (error) {
    next(error);
  }
}
