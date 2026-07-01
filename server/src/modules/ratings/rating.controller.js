import { Types } from "mongoose";
import { createHttpError, readEnum, readMongoId, readPositiveInt, readString } from "../../utils/requestValidation.js";
import { Rating } from "./rating.model.js";
import { ResourceComment } from "./resourceComment.model.js";
import { requirePasswordConfirmation } from "../../utils/passwordConfirmation.js";
import { awardReputation } from "../../services/reputation.service.js";

async function getResourceOwnerId(resourceType, resourceId) {
  try {
    if (resourceType === "resource") {
      const { Resource } = await import("../resources/resource.model.js");
      const res = await Resource.findById(resourceId).select("uploadedBy");
      return res?.uploadedBy;
    }
    if (resourceType === "marketplace-item") {
      const { MarketplaceItem } = await import("../marketplace/marketplace.model.js");
      const res = await MarketplaceItem.findById(resourceId).select("seller");
      return res?.seller;
    }
    if (resourceType === "lecture") {
      const { Lecture } = await import("../lectures/lecture.model.js");
      const res = await Lecture.findById(resourceId).select("professor");
      return res?.professor;
    }
    if (resourceType === "note") {
      const { Note } = await import("../notes/note.model.js");
      const res = await Note.findById(resourceId).select("author");
      return res?.author;
    }
  } catch (err) {
    console.error("Error finding resource owner:", err);
  }
  return null;
}

function readFeedbackResource(req) {
  const resourceType = readEnum(req.body.resourceType || req.query.resourceType, {
    field: "resourceType",
    allowed: ["resource", "lecture", "note", "marketplace-item"]
  });
  const resourceId = readMongoId(req.body.resourceId || req.query.resourceId, {
    field: "resourceId"
  });
  return { resourceType, resourceId };
}

export async function createRating(req, res, next) {
  try {
    const { resourceType, resourceId } = readFeedbackResource(req);
    const vote = readEnum(req.body.vote || "neutral", {
      field: "vote",
      allowed: ["upvote", "downvote", "neutral"],
      defaultValue: "neutral"
    });
    const starsRaw = Number(req.body.stars ?? 0);
    const stars = Number.isFinite(starsRaw)
      ? readPositiveInt(Math.max(0, Math.round(starsRaw)), {
          field: "stars",
          min: 0,
          max: 5,
          defaultValue: 0
        })
      : 0;

    const existingRating = await Rating.findOne({ resourceType, resourceId, user: req.user.id });

    if (!stars && vote === "neutral") {
      if (existingRating) {
        let revertDiff = 0;
        if (existingRating.vote === "upvote") revertDiff = -2;
        else if (existingRating.vote === "downvote") revertDiff = 1;

        if (revertDiff !== 0) {
          const ownerId = await getResourceOwnerId(resourceType, resourceId);
          if (ownerId && ownerId.toString() !== req.user.id) {
            await awardReputation({ userId: ownerId, points: revertDiff, reason: "Rating removed from resource", req });
          }
        }
      }
      await Rating.deleteOne({ resourceType, resourceId, user: req.user.id });
      res.status(200).json({ success: true, message: "Rating removed.", data: null });
      return;
    }

    let pointDiff = 0;
    // Apply new vote impact
    if (vote === "upvote" && (!existingRating || existingRating.vote !== "upvote")) {
      pointDiff += 2;
    } else if (vote === "downvote" && (!existingRating || existingRating.vote !== "downvote")) {
      pointDiff -= 1;
    }

    // Revert old vote impact
    if (existingRating && existingRating.vote === "upvote" && vote !== "upvote") {
      pointDiff -= 2;
    } else if (existingRating && existingRating.vote === "downvote" && vote !== "downvote") {
      pointDiff += 1;
    }

    const rating = await Rating.findOneAndUpdate(
      { resourceType, resourceId, user: req.user.id },
      {
        $set: {
          stars,
          vote
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    if (pointDiff !== 0) {
      const ownerId = await getResourceOwnerId(resourceType, resourceId);
      if (ownerId && ownerId.toString() !== req.user.id) {
        await awardReputation({ 
          userId: ownerId, 
          points: pointDiff, 
          reason: pointDiff > 0 ? "Received an upvote on a resource" : "Upvote removed or changed from resource",
          req 
        });
      }
    }

    res.status(201).json({ success: true, data: rating });
  } catch (error) {
    next(error);
  }
}

export async function getRatings(req, res, next) {
  try {
    const filters = {};
    if (req.query.resourceType) filters.resourceType = req.query.resourceType;
    if (req.query.resourceId) filters.resourceId = req.query.resourceId;

    const ratings = await Rating.find(filters).populate("user", "fullName");
    res.json({ success: true, data: ratings });
  } catch (error) {
    next(error);
  }
}

export async function getRatingSummary(req, res, next) {
  try {
    const { resourceType, resourceId } = readFeedbackResource(req);
    const commentLimit = readPositiveInt(req.query.commentLimit, {
      field: "commentLimit",
      min: 1,
      max: 50,
      defaultValue: 10
    });

    const [summaryRows, myRating, comments, commentsTotal] = await Promise.all([
      Rating.aggregate([
        {
          $match: {
            resourceType,
            resourceId: new Types.ObjectId(resourceId)
          }
        },
        {
          $group: {
            _id: null,
            totalRatings: { $sum: { $cond: [{ $gt: ["$stars", 0] }, 1, 0] } },
            starSum: { $sum: { $cond: [{ $gt: ["$stars", 0] }, "$stars", 0] } },
            upvotes: { $sum: { $cond: [{ $eq: ["$vote", "upvote"] }, 1, 0] } },
            downvotes: { $sum: { $cond: [{ $eq: ["$vote", "downvote"] }, 1, 0] } }
          }
        }
      ]),
      req.user?.id
        ? Rating.findOne({ resourceType, resourceId, user: req.user.id }).select("stars vote updatedAt")
        : null,
      ResourceComment.find({ resourceType, resourceId })
        .sort({ createdAt: -1 })
        .limit(commentLimit)
        .populate("user", "fullName role"),
      ResourceComment.countDocuments({ resourceType, resourceId })
    ]);

    const summary = summaryRows[0] || {
      totalRatings: 0,
      starSum: 0,
      upvotes: 0,
      downvotes: 0
    };
    const averageStars =
      summary.totalRatings > 0 ? Number((summary.starSum / summary.totalRatings).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        resourceType,
        resourceId,
        metrics: {
          averageStars,
          totalRatings: summary.totalRatings || 0,
          upvotes: summary.upvotes || 0,
          downvotes: summary.downvotes || 0,
          comments: commentsTotal
        },
        myRating: myRating || null,
        comments
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function addComment(req, res, next) {
  try {
    const { resourceType, resourceId } = readFeedbackResource(req);
    const comment = readString(req.body.comment, { field: "comment", min: 1, max: 500 });

    const saved = await ResourceComment.create({
      resourceType,
      resourceId,
      comment,
      user: req.user.id
    });

    await awardReputation({
      userId: req.user.id,
      points: 1,
      reason: "Posted a comment on a resource",
      req
    });

    const populated = await ResourceComment.findById(saved._id).populate("user", "fullName role");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req, res, next) {
  try {
    await requirePasswordConfirmation(req);
    const commentId = readMongoId(req.params.commentId, { field: "commentId" });
    const comment = await ResourceComment.findById(commentId);

    if (!comment) {
      throw createHttpError("Comment not found.", 404);
    }

    const isOwner = String(comment.user) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to delete this comment.", 403);
    }

    await comment.deleteOne();

    const penalty = isAdmin && !isOwner ? -5 : -1;
    const reason = isAdmin && !isOwner ? "Comment deleted by admin (spam/violation)" : "Comment deleted by user";
    await awardReputation({ userId: comment.user, points: penalty, reason, req });

    res.json({ success: true, message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
}
