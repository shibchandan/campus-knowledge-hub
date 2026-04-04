import { Resource } from "./resource.model.js";
import { ResourceAccessPurchase } from "./resourceAccess.model.js";
import { MarketplacePurchase } from "../marketplace/marketplace.model.js";
import path from "path";
import { uploadDirectory } from "../../middleware/uploadMiddleware.js";
import { createAuditLog } from "../../services/audit.service.js";
import { removeStoredFile, storeUploadedFile } from "../../services/resourceStorage.service.js";
import { removeTempFile, scanFileForMalware } from "../../services/malwareScan.service.js";
import {
  createHttpError,
  readMongoId,
  readEnum,
  readPagination,
  readSearchPattern,
  readString
} from "../../utils/requestValidation.js";
import {
  buildCollegeNameRegex,
  collegeNameMatches,
  requireStudentAssignedCollege
} from "../../utils/studentCollegeAccess.js";

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

function readVisibility(value, fallbackValue = "private") {
  return readEnum(value || fallbackValue, {
    field: "visibility",
    allowed: ["personal", "private", "protected", "public"]
  });
}

function readAccessPrice(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createHttpError("Access price must be a non-negative number.");
  }

  return Number(numeric.toFixed(2));
}

function readAllowBasicSubscription(value) {
  return String(value || "false").trim().toLowerCase() === "true";
}

async function loadCrossCollegeAccessContext(user) {
  if (!user?.id) {
    return { protectedGrantIds: new Set(), hasBasicSubscription: false };
  }

  const [purchases, grants] = await Promise.all([
    MarketplacePurchase.find({ buyer: user.id })
      .populate("item", "resourceType isPublished isArchived")
      .select("item"),
    ResourceAccessPurchase.find({ buyer: user.id }).select("resource")
  ]);

  const now = new Date();
  const hasBasicSubscription = purchases.some(
    (purchase) =>
      purchase.item?.resourceType === "subscription" &&
      purchase.item?.subscriptionPlan === "basic" &&
      purchase.item?.isArchived !== true &&
      purchase.accessExpiresAt &&
      new Date(purchase.accessExpiresAt) > now
  );

  return {
    hasBasicSubscription,
    protectedGrantIds: new Set(grants.map((grant) => String(grant.resource)))
  };
}

function canAccessResource(resource, user, accessContext = { protectedGrantIds: new Set(), hasBasicSubscription: false }) {
  const visibility = resource.visibility || "private";

  if (visibility === "public") {
    return true;
  }

  if (!user?.id) {
    return false;
  }

  const isOwner = String(resource.uploadedBy?._id || resource.uploadedBy) === String(user.id);
  const isAdmin = user.role === "admin";
  if (isOwner || isAdmin) {
    return true;
  }

  const sameCollege = collegeNameMatches(resource.collegeName, user.collegeName);

  if (visibility === "personal") {
    return false;
  }

  if (visibility === "private") {
    return sameCollege;
  }

  if (visibility === "protected") {
    if (sameCollege) {
      return true;
    }

    if (accessContext.protectedGrantIds?.has(String(resource._id))) {
      return true;
    }

    if (resource.allowBasicSubscription && accessContext.hasBasicSubscription) {
      return true;
    }
  }

  return false;
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
      textContent,
      visibility,
      accessPrice,
      allowBasicSubscription
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
    const cleanedVisibility = readVisibility(visibility, req.user.role === "student" ? "personal" : "private");
    const cleanedAccessPrice = readAccessPrice(accessPrice);
    const cleanedAllowBasicSubscription = readAllowBasicSubscription(allowBasicSubscription);

    if (req.user.role === "student" && cleanedVisibility !== "personal") {
      throw createHttpError("Students can upload only personal resources.", 403);
    }

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req, {
        pendingMessage: "Verify your student college ID before uploading personal resources."
      });
    }

    if (["private", "protected", "public"].includes(cleanedVisibility) && !["representative", "admin"].includes(req.user.role)) {
      throw createHttpError("Only representative or admin can upload private, protected, or public resources.", 403);
    }

    if (cleanedVisibility !== "protected" && cleanedAccessPrice > 0) {
      throw createHttpError("Access price can be added only for protected resources.");
    }

    if (cleanedVisibility !== "protected" && cleanedAllowBasicSubscription) {
      throw createHttpError("Basic subscription access applies only to protected resources.");
    }

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
      visibility: cleanedVisibility,
      accessPrice: cleanedVisibility === "protected" ? cleanedAccessPrice : 0,
      allowBasicSubscription: cleanedVisibility === "protected" ? cleanedAllowBasicSubscription : false,
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
        storageProvider: resource.storageProvider,
        visibility: resource.visibility
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

    if (req.query.collegeName) {
      filters.collegeName = buildCollegeNameRegex(
        readString(req.query.collegeName, {
          field: "collegeName",
          min: 3,
          max: 120
        })
      );
    } else if (req.user?.role === "student" && req.user.collegeName) {
      filters.collegeName = buildCollegeNameRegex(req.user.collegeName);
    }

    for (const key of filterKeys) {
      if (key === "collegeName") {
        continue;
      }

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

    const [accessContext, rawItems] = await Promise.all([
      loadCrossCollegeAccessContext(req.user),
      Resource.find(filters).populate("uploadedBy", "fullName email role").sort({ createdAt: -1 })
    ]);

    const items = rawItems.filter((resource) => canAccessResource(resource, req.user, accessContext));
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        items: paginatedItems,
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

    const accessContext = await loadCrossCollegeAccessContext(req.user);
    if (!canAccessResource(resource, req.user, accessContext)) {
      throw createHttpError(
        resource.visibility === "protected"
          ? "Unlock this protected resource first."
          : "You are not allowed to access this resource.",
        req.user?.id ? 403 : 401
      );
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
    const visibility = readVisibility(req.body.visibility, resource.visibility || "private");
    const accessPrice = readAccessPrice(req.body.accessPrice);
    const allowBasicSubscription = readAllowBasicSubscription(req.body.allowBasicSubscription);

    if (req.user.role === "student" && visibility !== "personal") {
      throw createHttpError("Students can keep only personal resource visibility.", 403);
    }

    if (req.user.role === "student" && (visibility !== resource.visibility || accessPrice > 0 || allowBasicSubscription)) {
      throw createHttpError("Students cannot convert personal resources into shared access resources.", 403);
    }

    resource.title = title;
    resource.description = description;
    resource.textContent = textContent;
    resource.visibility = visibility;
    resource.accessPrice = visibility === "protected" ? accessPrice : 0;
    resource.allowBasicSubscription = visibility === "protected" ? allowBasicSubscription : false;
    await resource.save();
    await createAuditLog({
      req,
      action: "resource.update",
      entityType: "resource",
      entityId: resource._id,
      metadata: {
        categoryId: resource.categoryId,
        subjectId: resource.subjectId,
        title: resource.title,
        visibility: resource.visibility
      }
    });

    const updated = await Resource.findById(resource._id).populate("uploadedBy", "fullName email role");
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function unlockProtectedResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId).populate("uploadedBy", "fullName email role");

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if ((resource.visibility || "private") !== "protected") {
      throw createHttpError("Only protected resources require unlock access.");
    }

    const sameCollege = collegeNameMatches(resource.collegeName, req.user.collegeName);
    if (sameCollege) {
      return res.json({
        success: true,
        message: "This protected resource is already available inside the same college.",
        data: { accessType: "same-college", amount: 0, currency: "INR" }
      });
    }

    const accessContext = await loadCrossCollegeAccessContext(req.user);
    if (accessContext.protectedGrantIds.has(String(resource._id))) {
      return res.json({
        success: true,
        message: "Protected resource is already unlocked for your account.",
        data: { accessType: "paid-unlock", amount: resource.accessPrice || 0, currency: "INR" }
      });
    }

    if (resource.allowBasicSubscription && accessContext.hasBasicSubscription) {
      const grant = await ResourceAccessPurchase.findOneAndUpdate(
        { resource: resource._id, buyer: req.user.id },
        {
          $setOnInsert: {
            seller: resource.uploadedBy?._id || resource.uploadedBy,
            amount: 0,
            currency: "INR",
            accessType: "basic-subscription"
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json({
        success: true,
        message: "Protected resource unlocked using your basic subscription.",
        data: grant
      });
    }

    const grant = await ResourceAccessPurchase.findOneAndUpdate(
      { resource: resource._id, buyer: req.user.id },
      {
        $setOnInsert: {
          seller: resource.uploadedBy?._id || resource.uploadedBy,
          amount: resource.accessPrice || 0,
          currency: "INR",
          accessType: "paid-unlock"
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message:
        (resource.accessPrice || 0) > 0
          ? "Protected resource purchase recorded."
          : "Protected resource unlocked successfully.",
      data: grant
    });
  } catch (error) {
    next(error);
  }
}
