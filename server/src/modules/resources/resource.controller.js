import { Resource } from "./resource.model.js";
import path from "path";
import { uploadDirectory } from "../../middleware/uploadMiddleware.js";
import { createAuditLog } from "../../services/audit.service.js";
import { removeStoredFile, storeUploadedFile } from "../../services/resourceStorage.service.js";
import { removeTempFile, scanFileForMalware } from "../../services/malwareScan.service.js";
import {
  createHttpError,
  readMongoId,
  readPagination,
  readSearchPattern,
  readString
} from "../../utils/requestValidation.js";

const CATEGORY_POLICIES = {
  lecture: {
    requireFile: true,
    allowTextOnly: false,
    mimeAllowlist: ["video/"],
    maxFileSize: 200 * 1024 * 1024
  },
  "pdf-ppt": {
    requireFile: true,
    allowTextOnly: false,
    mimeAllowlist: [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    maxFileSize: 25 * 1024 * 1024
  },
  books: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    maxFileSize: 30 * 1024 * 1024
  },
  "class-notes": {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/"
    ],
    maxFileSize: 20 * 1024 * 1024
  },
  lab: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/"
    ],
    maxFileSize: 20 * 1024 * 1024
  },
  pyq: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: ["application/pdf", "image/"],
    maxFileSize: 20 * 1024 * 1024
  },
  notice: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: ["application/pdf", "image/", "text/"],
    maxFileSize: 10 * 1024 * 1024
  },
  syllabus: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: ["application/pdf", "application/msword", "text/"],
    maxFileSize: 10 * 1024 * 1024
  },
  suggestion: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: ["application/pdf", "text/"],
    maxFileSize: 10 * 1024 * 1024
  }
};

function getPolicy(categoryId) {
  return (
    CATEGORY_POLICIES[categoryId] || {
      requireFile: false,
      allowTextOnly: true,
      mimeAllowlist: []
    }
  );
}

function mimeAllowed(mimeType, allowlist) {
  if (!allowlist.length) {
    return true;
  }

  return allowlist.some((allowed) =>
    allowed.endsWith("/") ? mimeType.startsWith(allowed) : mimeType === allowed
  );
}

export async function uploadResource(req, res, next) {
  try {
    const {
      collegeName,
      programId,
      branchId,
      semesterId,
      subjectId,
      categoryId,
      title,
      description,
      textContent
    } = req.body;

    const cleanedCollegeName = readString(collegeName, { field: "collegeName", min: 3, max: 120 });
    const cleanedProgramId = readString(programId, { field: "programId", min: 2, max: 60 });
    const cleanedBranchId = readString(branchId, { field: "branchId", min: 2, max: 60 });
    const cleanedSemesterId = readString(semesterId, { field: "semesterId", min: 2, max: 60 });
    const cleanedSubjectId = readString(subjectId, { field: "subjectId", min: 2, max: 120 });
    const cleanedCategoryId = readString(categoryId, { field: "categoryId", min: 2, max: 40 });
    const cleanedTitle = readString(title, { field: "Title", min: 1, max: 160 });
    const cleanedDescription = readString(description, {
      field: "Description",
      required: false,
      max: 500
    });
    const cleanedText = readString(textContent, {
      field: "Text content",
      required: false,
      max: 25000
    });

    const categoryKey = cleanedCategoryId;
    const policy = getPolicy(categoryKey);

    if (policy.requireFile && !req.file) {
      throw createHttpError(`${categoryKey} category requires file upload.`);
    }

    if (!policy.allowTextOnly && cleanedText) {
      throw createHttpError(`${categoryKey} category does not allow text-only content.`);
    }

    if (req.file && !mimeAllowed(req.file.mimetype, policy.mimeAllowlist)) {
      throw createHttpError(`Invalid file type for ${categoryKey} category.`);
    }

    if (req.file && policy.maxFileSize && req.file.size > policy.maxFileSize) {
      throw createHttpError(`File is too large for ${categoryKey} category.`, 413);
    }

    if (!req.file && !cleanedText) {
      throw createHttpError("Upload a file or provide text content.");
    }

    if (req.file) {
      await scanFileForMalware(req.file.path);
    }

    const storedFile = await storeUploadedFile(req.file);
    const localFileUrl =
      storedFile.storageProvider === "local" && req.file
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
        : "";
    const fileUrl = storedFile.fileUrl || localFileUrl;
    const previewUrl = storedFile.previewUrl || fileUrl;

    const resource = await Resource.create({
      collegeName: cleanedCollegeName,
      programId: cleanedProgramId,
      branchId: cleanedBranchId,
      semesterId: cleanedSemesterId,
      subjectId: cleanedSubjectId,
      categoryId: categoryKey,
      title: cleanedTitle,
      description: cleanedDescription,
      textContent: cleanedText,
      fileOriginalName: storedFile.fileOriginalName,
      fileStoredName: storedFile.fileStoredName,
      fileMimeType: storedFile.fileMimeType,
      fileSize: storedFile.fileSize,
      storageProvider: storedFile.storageProvider,
      fileUrl,
      previewUrl,
      cloudObjectKey: storedFile.cloudObjectKey,
      uploadedBy: req.user.id
    });
    await createAuditLog({
      req,
      action: "resource.upload",
      entityType: "resource",
      entityId: resource._id,
      metadata: {
        categoryId: resource.categoryId,
        subjectId: resource.subjectId,
        storageProvider: resource.storageProvider
      }
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    if (req.file?.path) {
      await removeTempFile(req.file.path);
    }
    next(error);
  }
}

export async function getResources(req, res, next) {
  try {
    const filters = {};
    const filterKeys = [
      "collegeName",
      "programId",
      "branchId",
      "semesterId",
      "subjectId",
      "categoryId"
    ];

    for (const key of filterKeys) {
      if (req.query[key]) {
        filters[key] = readString(req.query[key], {
          field: key,
          min: 1,
          max: 120
        });
      }
    }

    const pattern = readSearchPattern(req.query.search, { max: 100 });
    if (pattern) {
      filters.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { textContent: { $regex: pattern, $options: "i" } }
      ];
    }

    const { page, limit, skip } = readPagination(req.query, {
      defaultLimit: 12,
      maxLimit: 50
    });

    const [items, total] = await Promise.all([
      Resource.find(filters)
        .populate("uploadedBy", "fullName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Resource.countDocuments(filters)
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

export async function downloadResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if (!resource.fileUrl) {
      throw createHttpError("This resource has no file to download.", 400);
    }

    if (resource.storageProvider !== "local") {
      res.redirect(resource.fileUrl);
      return;
    }

    const filePath = path.resolve(uploadDirectory, resource.fileStoredName);
    res.download(filePath, resource.fileOriginalName || resource.fileStoredName);
  } catch (error) {
    next(error);
  }
}

export async function deleteResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    const isOwner = String(resource.uploadedBy) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to delete this resource.", 403);
    }

    await resource.deleteOne();
    await removeStoredFile(resource);
    await createAuditLog({
      req,
      action: "resource.delete",
      entityType: "resource",
      entityId: resource._id,
      metadata: {
        categoryId: resource.categoryId,
        subjectId: resource.subjectId
      }
    });

    res.json({ success: true, message: "Resource deleted successfully." });
  } catch (error) {
    next(error);
  }
}

export async function updateResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    const isOwner = String(resource.uploadedBy) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to update this resource.", 403);
    }

    const title = readString(req.body.title, { field: "Title", min: 1, max: 160 });
    const description = readString(req.body.description, {
      field: "Description",
      required: false,
      max: 500
    });
    const textContent = readString(req.body.textContent, {
      field: "Text content",
      required: false,
      max: 25000
    });

    resource.title = title;
    resource.description = description;
    resource.textContent = textContent;
    await resource.save();
    await createAuditLog({
      req,
      action: "resource.update",
      entityType: "resource",
      entityId: resource._id,
      metadata: {
        categoryId: resource.categoryId,
        subjectId: resource.subjectId,
        title: resource.title
      }
    });

    const updated = await Resource.findById(resource._id).populate("uploadedBy", "fullName email role");
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
