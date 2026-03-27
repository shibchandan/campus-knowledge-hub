import { AuditLog } from "./audit.model.js";
import { readPagination } from "../../utils/requestValidation.js";

export async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = readPagination(req.query, {
      defaultLimit: 25,
      maxLimit: 100
    });

    const [items, total] = await Promise.all([
      AuditLog.find()
        .populate("actorUserId", "fullName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
