import { Resource } from "./resource.model.js";
import { ResourceReport } from "./resourceReport.model.js";
import { ResourceAccessPurchase } from "./resourceAccess.model.js";
import { MarketplacePurchase } from "../marketplace/marketplace.model.js";
import { CollegeCourse } from "../governance/governance.model.js";
import { User } from "../auth/auth.model.js";
import { Notification } from "../notifications/notification.model.js";
import path from "path";
import { uploadDirectory } from "../../middleware/uploadMiddleware.js";
import { createAuditLog } from "../../services/audit.service.js";
import { awardReputation } from "../../services/reputation.service.js";
import { removeStoredFile, storeUploadedFile } from "../../services/resourceStorage.service.js";
import { sendAdminNotification } from "../../services/email.service.js";
import { removeTempFile, scanFileForMalware } from "../../services/malwareScan.service.js";
import { extractTextFromFile } from "../../services/pdfExtract.service.js";
import {
  buildRazorpayCheckoutPayload,
  createRazorpayOrder,
  verifyRazorpaySignature
} from "../../services/payment.service.js";
import { PaymentOrder } from "../payments/payment.model.js";
import {
  createHttpError,
  escapeHtml,
  normalizeCollegeName,
  readEnum,
  readMongoId,
  readPagination,
  readPositiveInt,
  readSearchPattern,
  readString
} from "../../utils/requestValidation.js";
import {
  buildCollegeNameRegex,
  collegeNameMatches,
  normalizeCourseAccessKey,
  requireStudentAssignedCollege
} from "../../utils/studentCollegeAccess.js";
import { requirePasswordConfirmation } from "../../utils/passwordConfirmation.js";

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
  },
  assignment: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/",
      "text/"
    ],
    maxFileSize: 25 * 1024 * 1024
  },
  project: {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/x-zip-compressed",
      "text/"
    ],
    maxFileSize: 50 * 1024 * 1024
  },
  "extra-resource": {
    requireFile: false,
    allowTextOnly: true,
    mimeAllowlist: [],
    maxFileSize: 50 * 1024 * 1024
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

function serializeResourceForClient(resource, req, user, accessContext = { protectedGrantIds: new Set(), hasBasicSubscription: false }) {
  const payload = typeof resource.toObject === "function" ? resource.toObject() : { ...resource };

  const hasAccess = canAccessResource(payload, user, accessContext);

  if (!hasAccess) {
    payload.isLocked = true;
    delete payload.fileUrl;
    delete payload.previewUrl;
    delete payload.textContent;
    delete payload.fileOriginalName;
    delete payload.fileStoredName;
    delete payload.cloudObjectKey;
  } else {
    payload.isLocked = false;
    if (payload.storageProvider === "local" && payload.fileStoredName) {
      const accessPath = `/api/resources/${payload._id}/file`;
      const absoluteUrl = req
        ? `${req.protocol}://${req.get("host")}${accessPath}`
        : accessPath;

      payload.fileUrl = absoluteUrl;
      payload.previewUrl = absoluteUrl;
    }
  }

  return payload;
}

async function assertRepresentativeResourceAccess(user, collegeName, programId) {
  if (user.role !== "representative") {
    return;
  }

  if (collegeNameMatches(user.collegeName, collegeName)) {
    return;
  }

  const targetCollege = String(collegeName || "").trim().toLowerCase().replace(/\s+/g, " ");
  const targetProgram = normalizeCourseAccessKey(programId);
  const approvedCourses = await CollegeCourse.find({
    collegeNameNormalized: targetCollege,
    addedByRepresentative: user.id
  }).select("courseName");

  const hasMatch = approvedCourses.some(
    (course) => normalizeCourseAccessKey(course.courseName) === targetProgram
  );

  if (!hasMatch) {
    throw createHttpError(
      "Representative can manage shared resources only for their directly assigned college or approved college courses assigned to them.",
      403
    );
  }
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

function combineMongoFilters(...filters) {
  const activeFilters = filters.filter((filter) => filter && Object.keys(filter).length > 0);

  if (!activeFilters.length) {
    return {};
  }

  if (activeFilters.length === 1) {
    return activeFilters[0];
  }

  return { $and: activeFilters };
}

export function buildAccessibleResourceFilter(
  user,
  accessContext = { protectedGrantIds: new Set(), hasBasicSubscription: false }
) {
  if (user?.role === "admin") {
    return {};
  }

  if (!user?.id) {
    return {};
  }

  const filters = [{ uploadedBy: user.id }, { visibility: "public" }];

  if (user.collegeName) {
    const sameCollegeFilter = { collegeName: buildCollegeNameRegex(user.collegeName) };

    filters.push(
      { $and: [{ visibility: "private" }, sameCollegeFilter] },
      { $and: [{ visibility: "protected" }, sameCollegeFilter] }
    );
  }

  const protectedAccessFilters = [];

  if (accessContext.protectedGrantIds?.size) {
    protectedAccessFilters.push({
      _id: { $in: Array.from(accessContext.protectedGrantIds) }
    });
  }

  if (accessContext.hasBasicSubscription) {
    protectedAccessFilters.push({ allowBasicSubscription: true });
  }

  if (protectedAccessFilters.length) {
    filters.push({
      visibility: "protected",
      $or: protectedAccessFilters
    });
  }

  return { $or: filters };
}

async function grantProtectedResourceAccess(resource, buyerId, accessType, amount = 0) {
  return ResourceAccessPurchase.findOneAndUpdate(
    { resource: resource._id, buyer: buyerId },
    {
      $setOnInsert: {
        seller: resource.uploadedBy?._id || resource.uploadedBy,
        amount,
        currency: "INR",
        accessType
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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
      textContent,
      visibility,
      accessPrice,
      allowBasicSubscription,
      externalLink
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
        unverifiedMessage: "Verify your student college ID before uploading personal resources."
      });
    }

    if (["private", "protected", "public"].includes(cleanedVisibility) && !["representative", "admin"].includes(req.user.role)) {
      throw createHttpError("Only representative or admin can upload private, protected, or public resources.", 403);
    }

    if (["private", "protected", "public"].includes(cleanedVisibility) && req.user.role === "representative") {
      await assertRepresentativeResourceAccess(req.user, cleanedCollegeName, cleanedProgramId);
    }

    if (cleanedVisibility !== "protected" && cleanedAccessPrice > 0) {
      throw createHttpError("Access price can be added only for protected resources.");
    }

    if (cleanedVisibility !== "protected" && cleanedAllowBasicSubscription) {
      throw createHttpError("Basic subscription access applies only to protected resources.");
    }

    const cleanExternalLink = externalLink ? String(externalLink).trim() : "";
    if (cleanExternalLink && !/^https?:\/\/\S+$/i.test(cleanExternalLink)) {
      throw createHttpError("Invalid external link URL format.");
    }

    if (policy.requireFile && !req.file && !cleanExternalLink) {
      throw createHttpError(`${categoryKey} category requires a file upload or an external link.`);
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

    if (!req.file && !cleanedText && !cleanExternalLink) {
      throw createHttpError("Upload a file, provide text content, or share an external link.");
    }

    if (req.file) {
      await scanFileForMalware(req.file.path);
    }

    // Auto-extract text from PDFs for RAG context — user-typed text takes priority
    const extractedText = await extractTextFromFile(req.file);
    const finalTextContent = cleanedText || extractedText;

    const storedFile = await storeUploadedFile(req.file);
    const fileUrl = cleanExternalLink || storedFile.fileUrl || "";
    const previewUrl = cleanExternalLink || storedFile.previewUrl || fileUrl;
    const fileOriginalName = cleanExternalLink ? "External Link" : storedFile.fileOriginalName;
    const fileMimeType = cleanExternalLink ? "text/html" : storedFile.fileMimeType;
    const storageProvider = cleanExternalLink ? "external" : storedFile.storageProvider;

    const resource = await Resource.create({
      collegeName: cleanedCollegeName,
      programId: cleanedProgramId,
      branchId: cleanedBranchId,
      semesterId: cleanedSemesterId,
      subjectId: cleanedSubjectId,
      categoryId: categoryKey,
      title: cleanedTitle,
      description: cleanedDescription,
      textContent: finalTextContent,
      fileOriginalName,
      fileStoredName: storedFile.fileStoredName,
      fileMimeType,
      fileSize: storedFile.fileSize,
      storageProvider,
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

    // --- Trigger Notifications to Students ---
    if (["public", "protected"].includes(cleanedVisibility)) {
      try {
        const query = { role: "student", collegeName: cleanedCollegeName };
        const students = await User.find(query).select("_id");
        if (students.length > 0) {
          const notificationsToInsert = students.map((student) => ({
            recipientId: student._id,
            collegeName: cleanedCollegeName,
            title: `New Resource: ${cleanedTitle}`,
            message: `A new resource was added to ${cleanedCollegeName}.`,
            type: "info",
            link: `/dashboard/${cleanedProgramId}/branch/${cleanedBranchId}/${cleanedSemesterId}/${cleanedSubjectId}/${categoryKey}`
          }));
          await Notification.insertMany(notificationsToInsert, { ordered: false }).catch(() => {});
        }
      } catch (notifErr) {
        console.error("Failed to send resource upload notifications:", notifErr);
      }
    }
    // -----------------------------------------

    await awardReputation({
      userId: req.user.id,
      points: 5,
      reason: "Uploaded a new resource",
      req
    });

    const createdResource = await Resource.findById(resource._id).populate("uploadedBy", "fullName role");
    const accessContext = await loadCrossCollegeAccessContext(req.user);
    res.status(201).json({ success: true, data: serializeResourceForClient(createdResource, req, req.user, accessContext) });
  } catch (error) {
    if (req.file?.path) {
      await removeTempFile(req.file.path);
    }
    next(error);
  }
}

export async function getCategoryCounts(req, res, next) {
  try {
    const collegeName = readString(req.query.collegeName, { field: "collegeName", min: 3, max: 120 });
    const programId = readString(req.query.programId, { field: "programId", min: 2, max: 60 });
    const branchId = readString(req.query.branchId, { field: "branchId", min: 2, max: 60 });
    const semesterId = readString(req.query.semesterId, { field: "semesterId", min: 2, max: 60 });
    const subjectId = readString(req.query.subjectId, { field: "subjectId", min: 2, max: 120 });

    const matchFilter = {
      collegeName: buildCollegeNameRegex(collegeName),
      programId,
      branchId,
      semesterId,
      subjectId
    };

    const counts = await Resource.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    for (const entry of counts) {
      countMap[entry._id] = entry.count;
    }

    res.json({ success: true, data: countMap });
  } catch (error) {
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

    if (req.user?.role === "student") {
      requireStudentAssignedCollege(req);
    }

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

    const accessContext =
      req.user?.role === "admin" || !req.user?.id
        ? { protectedGrantIds: new Set(), hasBasicSubscription: false }
        : await loadCrossCollegeAccessContext(req.user);
    const accessFilter = buildAccessibleResourceFilter(req.user, accessContext);
    const queryFilters = combineMongoFilters(filters, accessFilter);

    const [total, items] = await Promise.all([
      Resource.countDocuments(queryFilters),
      Resource.find(queryFilters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "fullName role")
    ]);

    const paginatedItems = items.map((resource) => serializeResourceForClient(resource, req, req.user, accessContext));

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
    if (!req.user) {
      throw createHttpError("Please log in to download resources.", 401);
    }
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if (!resource.fileStoredName && !resource.fileUrl) {
      throw createHttpError("This resource has no file to download.", 400);
    }

    if (req.user?.role === "student") {
      requireStudentAssignedCollege(req);
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

export async function viewResourceFile(req, res, next) {
  try {
    if (!req.user) {
      throw createHttpError("Please log in to view resources.", 401);
    }
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if (!resource.fileStoredName && !resource.fileUrl) {
      throw createHttpError("This resource has no file to preview.", 400);
    }

    if (req.user?.role === "student") {
      requireStudentAssignedCollege(req);
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
    if (resource.fileMimeType) {
      res.type(resource.fileMimeType);
    }
    
    // Add strict security headers to prevent XSS from uploaded files (like SVG)
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

export async function deleteResource(req, res, next) {
  try {
    await requirePasswordConfirmation(req);
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

    const penalty = isAdmin && !isOwner ? -20 : -5;
    const reason = isAdmin && !isOwner ? "Resource deleted by admin (spam/violation)" : "Resource deleted by user";
    await awardReputation({ userId: resource.uploadedBy, points: penalty, reason, req });

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

    if (req.user.role === "representative") {
      await assertRepresentativeResourceAccess(req.user, resource.collegeName, resource.programId);
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

    const cleanExternalLink = req.body.externalLink ? String(req.body.externalLink).trim() : "";
    if (cleanExternalLink && !/^https?:\/\/\S+$/i.test(cleanExternalLink)) {
      throw createHttpError("Invalid external link URL format.");
    }

    resource.title = title;
    resource.description = description;
    resource.textContent = textContent;
    resource.visibility = visibility;
    resource.accessPrice = visibility === "protected" ? accessPrice : 0;
    resource.allowBasicSubscription = visibility === "protected" ? allowBasicSubscription : false;

    if (cleanExternalLink && resource.storageProvider === "external") {
      resource.fileUrl = cleanExternalLink;
      resource.previewUrl = cleanExternalLink;
    }

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

    const updated = await Resource.findById(resource._id).populate("uploadedBy", "fullName role");
    const accessContext = await loadCrossCollegeAccessContext(req.user);
    res.json({ success: true, data: serializeResourceForClient(updated, req, req.user, accessContext) });
  } catch (error) {
    next(error);
  }
}

export async function unlockProtectedResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const resource = await Resource.findById(resourceId).populate("uploadedBy", "fullName role");

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if ((resource.visibility || "private") !== "protected") {
      throw createHttpError("Only protected resources require unlock access.");
    }

    if (req.user.role === "student") {
      requireStudentAssignedCollege(req);
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
      const grant = await grantProtectedResourceAccess(
        resource,
        req.user.id,
        "basic-subscription",
        0
      );

      return res.status(201).json({
        success: true,
        message: "Protected resource unlocked using your basic subscription.",
        data: grant
      });
    }

    if ((resource.accessPrice || 0) > 0) {
      // IDEMPOTENCY CHECK: Reuse existing pending order
      const existingOrder = await PaymentOrder.findOne({
        buyer: req.user.id,
        resource: resource._id,
        status: "created"
      });

      if (existingOrder && existingOrder.gatewayOrderId && existingOrder.gatewayOrderId !== "pending") {
        return res.status(200).json({
          success: true,
          paymentRequired: true,
          message: "Resuming existing payment session.",
          data: {
            paymentOrderId: existingOrder._id,
            checkout: buildRazorpayCheckoutPayload({
              order: { id: existingOrder.gatewayOrderId, amount: existingOrder.amount, currency: existingOrder.currency },
              title: resource.title,
              description: "Protected academic resource unlock",
              customer: req.user
            })
          }
        });
      }

      let paymentOrder;
      try {
        paymentOrder = await PaymentOrder.create({
          gateway: "razorpay",
          purpose: "protected-resource",
          buyer: req.user.id,
          seller: resource.uploadedBy?._id || resource.uploadedBy,
          resource: resource._id,
          amount: resource.accessPrice || 0,
          currency: "INR",
          gatewayOrderId: "pending", // Placeholder
          gatewayReceipt: `res-${resource._id}-${Date.now()}`.slice(0, 40),
          metadata: {
            accessType: "paid-unlock"
          }
        });
      } catch (err) {
        if (err.code === 11000) {
          throw createHttpError("A payment session is already being created. Please wait a moment and try again.", 409);
        }
        throw err;
      }

      try {
        const gatewayOrder = await createRazorpayOrder({
          amount: resource.accessPrice || 0,
          currency: "INR",
          receipt: paymentOrder.gatewayReceipt,
          notes: {
            resourceId: String(resource._id),
            buyerId: String(req.user.id),
            accessType: "paid-unlock"
          }
        });
        paymentOrder.gatewayOrderId = gatewayOrder.id;
        await paymentOrder.save();
      } catch (err) {
        await paymentOrder.deleteOne();
        throw err;
      }

      return res.status(201).json({
        success: true,
        paymentRequired: true,
        message: "Complete payment to unlock this protected resource.",
        data: {
          paymentOrderId: paymentOrder._id,
          checkout: buildRazorpayCheckoutPayload({
            order: { id: paymentOrder.gatewayOrderId, amount: paymentOrder.amount, currency: paymentOrder.currency },
            title: resource.title,
            description: "Protected academic resource unlock",
            customer: req.user
          })
        }
      });
    }

    const grant = await grantProtectedResourceAccess(
      resource,
      req.user.id,
      "paid-unlock",
      resource.accessPrice || 0
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

export async function verifyProtectedResourcePayment(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const paymentOrderId = readMongoId(req.body.paymentOrderId, { field: "paymentOrderId" });
    const razorpayOrderId = readString(req.body.razorpayOrderId, {
      field: "razorpayOrderId",
      min: 6,
      max: 120
    });
    const razorpayPaymentId = readString(req.body.razorpayPaymentId, {
      field: "razorpayPaymentId",
      min: 6,
      max: 120
    });
    const razorpaySignature = readString(req.body.razorpaySignature, {
      field: "razorpaySignature",
      min: 6,
      max: 200
    });

    const [resource, paymentOrder] = await Promise.all([
      Resource.findById(resourceId).populate("uploadedBy", "fullName role"),
      PaymentOrder.findById(paymentOrderId)
    ]);

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    if ((resource.visibility || "private") !== "protected") {
      throw createHttpError("Only protected resources require payment verification.");
    }

    if (!paymentOrder) {
      throw createHttpError("Payment order not found.", 404);
    }

    if (String(paymentOrder.buyer) !== String(req.user.id)) {
      throw createHttpError("This payment order does not belong to your account.", 403);
    }

    if (String(paymentOrder.resource) !== String(resource._id)) {
      throw createHttpError("Payment order does not match this resource.", 400);
    }

    if (paymentOrder.status === "verified") {
      const existingGrant = await ResourceAccessPurchase.findOne({
        resource: resource._id,
        buyer: req.user.id
      });
      res.json({
        success: true,
        message: "Payment already verified for this resource.",
        data: existingGrant
      });
      return;
    }

    if (paymentOrder.status !== "created") {
      throw createHttpError("This payment order is not in a payable state.", 400);
    }

    if (paymentOrder.gatewayOrderId !== razorpayOrderId) {
      throw createHttpError("Gateway order mismatch for this resource payment.", 400);
    }

    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isSignatureValid) {
      paymentOrder.status = "failed";
      paymentOrder.gatewayPaymentId = razorpayPaymentId;
      paymentOrder.gatewaySignature = razorpaySignature;
      await paymentOrder.save();
      throw createHttpError("Payment signature verification failed.", 400);
    }

    paymentOrder.status = "verified";
    paymentOrder.gatewayPaymentId = razorpayPaymentId;
    paymentOrder.gatewaySignature = razorpaySignature;
    paymentOrder.verifiedAt = new Date();
    await paymentOrder.save();

    const grant = await grantProtectedResourceAccess(
      resource,
      req.user.id,
      "paid-unlock",
      resource.accessPrice || 0
    );

    await createAuditLog({
      req,
      action: "resource.verify_payment_unlock",
      entityType: "payment-order",
      entityId: paymentOrder._id,
      metadata: {
        resourceId: resource._id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency
      }
    });

    res.json({
      success: true,
      message: "Protected resource unlocked successfully after payment.",
      data: grant
    });
  } catch (error) {
    next(error);
  }
}

export async function reportResource(req, res, next) {
  try {
    const resourceId = readMongoId(req.params.resourceId, { field: "resourceId" });
    const reason = readEnum(req.body.reason, {
      field: "reason",
      allowed: ["copyright", "spam", "inappropriate", "quality_issue", "wrong_content", "other"],
      defaultValue: "other"
    });
    const comments = readString(req.body.comments, {
      field: "comments",
      min: 0,
      max: 1000,
      required: false
    });

    const resource = await Resource.findById(resourceId).populate("uploadedBy", "fullName email role");

    if (!resource) {
      throw createHttpError("Resource not found.", 404);
    }

    resource.isFlagged = true;
    await resource.save();

    const reporterName = req.user ? req.user.fullName : "Anonymous Student";
    const reporterEmail = req.user ? req.user.email : "N/A";
    const reporterRole = req.user ? req.user.role : "student";
    const uploaderName = resource.uploadedBy ? resource.uploadedBy.fullName : "Unknown";
    const uploaderEmail = resource.uploadedBy ? resource.uploadedBy.email : "N/A";

    const emailSubject = `[FLAGGED RESOURCE] "${resource.title}" has been reported`;
    const emailText = `
The following resource has been flagged/reported as inappropriate or violating terms.

Resource Details:
- Title: ${resource.title}
- ID: ${resource._id}
- Category: ${resource.categoryId}
- College: ${resource.collegeName}
- Uploaded By: ${uploaderName} (${uploaderEmail})

Report Details:
- Reported By: ${reporterName} (${reporterEmail}, Role: ${reporterRole})
- Reason: ${reason.toUpperCase()}
- Comments: ${comments || "None provided"}

Please review the resource on the platform database and take appropriate action.
`;

    const emailHtml = `
      <h3>Flagged Resource Report</h3>
      <p>The following resource has been flagged/reported as inappropriate or violating terms.</p>
      
      <h4>Resource Details:</h4>
      <ul>
        <li><strong>Title:</strong> ${escapeHtml(resource.title)}</li>
        <li><strong>ID:</strong> ${escapeHtml(resource._id.toString())}</li>
        <li><strong>Category:</strong> ${escapeHtml(resource.categoryId)}</li>
        <li><strong>College:</strong> ${escapeHtml(resource.collegeName)}</li>
        <li><strong>Uploaded By:</strong> ${escapeHtml(uploaderName)} (${escapeHtml(uploaderEmail)})</li>
      </ul>
      
      <h4>Report Details:</h4>
      <ul>
        <li><strong>Reported By:</strong> ${escapeHtml(reporterName)} (${escapeHtml(reporterEmail)}, Role: ${escapeHtml(reporterRole)})</li>
        <li><strong>Reason:</strong> ${escapeHtml(reason.toUpperCase())}</li>
        <li><strong>Comments:</strong> ${escapeHtml(comments || "None provided")}</li>
      </ul>
      
      <p>Please review the resource on the platform database and take appropriate action.</p>
    `;

    await sendAdminNotification({
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    await createAuditLog({
      req,
      action: "resource.report",
      entityType: "resource",
      entityId: resource._id,
      metadata: {
        reason,
        commentsLength: comments.length
      }
    });

    if (req.user) {
      await ResourceReport.create({
        resourceId: resource._id,
        reportedBy: req.user.id,
        collegeNameNormalized: resource.collegeNameNormalized,
        reason,
        description: comments
      });
    }

    res.json({
      success: true,
      message: "Resource reported successfully. Administrators have been notified."
    });
  } catch (error) {
    next(error);
  }
}

export async function getCollegeResourceReports(req, res, next) {
  try {
    const collegeNameNormalized = req.user.collegeNameNormalized;
    
    if (!collegeNameNormalized) {
      throw createHttpError("You are not associated with a college.", 400);
    }

    const reports = await ResourceReport.find({
      collegeNameNormalized,
      status: "pending"
    })
      .populate("resourceId", "title categoryId fileUrl linkUrl uploadedBy")
      .populate("reportedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
}

export async function dismissResourceReport(req, res, next) {
  try {
    const reportId = readMongoId(req.params.reportId, { field: "reportId" });
    const collegeNameNormalized = req.user.collegeNameNormalized;

    const report = await ResourceReport.findOne({
      _id: reportId,
      collegeNameNormalized
    });

    if (!report) {
      throw createHttpError("Report not found or access denied.", 404);
    }

    report.status = "dismissed";
    await report.save();

    res.json({
      success: true,
      message: "Report dismissed."
    });
  } catch (error) {
    next(error);
  }
}
