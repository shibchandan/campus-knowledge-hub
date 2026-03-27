import { AcademicSubject } from "./academic.model.js";
import { AcademicStructure } from "./academicStructure.model.js";
import { createAuditLog } from "../../services/audit.service.js";
import {
  validateAcademicStructurePayload,
  validateAcademicSubjectPayload
} from "./academic.validation.js";
import {
  createHttpError,
  normalizeCollegeName,
  readMongoId,
  readString
} from "../../utils/requestValidation.js";

export async function listAcademicSubjects(req, res, next) {
  try {
    const filters = {};
    if (req.query.collegeName) {
      filters.collegeNameNormalized = normalizeCollegeName(
        readString(req.query.collegeName, { field: "collegeName", min: 3, max: 120 })
      );
    }
    if (req.query.programId) {
      filters.programId = readString(req.query.programId, { field: "programId", min: 2, max: 60 });
    }
    if (req.query.branchId) {
      filters.branchId = readString(req.query.branchId, { field: "branchId", min: 2, max: 60 });
    }
    if (req.query.semesterId) {
      filters.semesterId = readString(req.query.semesterId, {
        field: "semesterId",
        min: 2,
        max: 60
      });
    }

    const subjects = await AcademicSubject.find(filters).sort({
      semesterId: 1,
      createdAt: 1
    });

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
}

export async function listAcademicStructures(req, res, next) {
  try {
    const filters = {};
    if (req.query.collegeName) {
      filters.collegeNameNormalized = normalizeCollegeName(
        readString(req.query.collegeName, { field: "collegeName", min: 3, max: 120 })
      );
    }
    if (req.query.programId) {
      filters.programId = readString(req.query.programId, { field: "programId", min: 2, max: 60 });
    }
    if (req.query.branchId) {
      filters.branchId = readString(req.query.branchId, { field: "branchId", min: 2, max: 60 });
    }

    const structures = await AcademicStructure.find(filters).sort({
      programName: 1,
      branchName: 1,
      semesterOrder: 1
    });

    res.json({ success: true, data: structures });
  } catch (error) {
    next(error);
  }
}

export async function createAcademicStructure(req, res, next) {
  try {
    const payload = validateAcademicStructurePayload(req.body);
    const structure = await AcademicStructure.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: "admin.create_academic_structure",
      entityType: "academic_structure",
      entityId: structure._id,
      metadata: {
        collegeName: structure.collegeName,
        programId: structure.programId,
        branchId: structure.branchId,
        semesterId: structure.semesterId
      }
    });

    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    next(error);
  }
}

export async function updateAcademicStructure(req, res, next) {
  try {
    const payload = validateAcademicStructurePayload(req.body);
    const structureId = readMongoId(req.params.structureId, { field: "structureId" });
    const structure = await AcademicStructure.findById(structureId);

    if (!structure) {
      throw createHttpError("Academic structure not found.", 404);
    }

    Object.assign(structure, payload);
    await structure.save();
    await createAuditLog({
      req,
      action: "admin.update_academic_structure",
      entityType: "academic_structure",
      entityId: structure._id,
      metadata: {
        collegeName: structure.collegeName,
        programId: structure.programId,
        branchId: structure.branchId,
        semesterId: structure.semesterId
      }
    });

    res.json({ success: true, data: structure });
  } catch (error) {
    next(error);
  }
}

export async function deleteAcademicStructure(req, res, next) {
  try {
    const structureId = readMongoId(req.params.structureId, { field: "structureId" });
    const structure = await AcademicStructure.findById(structureId);

    if (!structure) {
      throw createHttpError("Academic structure not found.", 404);
    }

    await AcademicSubject.deleteMany({
      collegeNameNormalized: structure.collegeNameNormalized,
      programId: structure.programId,
      branchId: structure.branchId,
      semesterId: structure.semesterId
    });

    await structure.deleteOne();
    await createAuditLog({
      req,
      action: "admin.delete_academic_structure",
      entityType: "academic_structure",
      entityId: structure._id,
      metadata: {
        collegeName: structure.collegeName,
        programId: structure.programId,
        branchId: structure.branchId,
        semesterId: structure.semesterId
      }
    });
    res.json({ success: true, message: "Academic structure deleted successfully." });
  } catch (error) {
    next(error);
  }
}

export async function createAcademicSubject(req, res, next) {
  try {
    const payload = validateAcademicSubjectPayload(req.body);
    const subject = await AcademicSubject.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: "admin.create_academic_subject",
      entityType: "academic_subject",
      entityId: subject._id,
      metadata: {
        collegeName: subject.collegeName,
        programId: subject.programId,
        branchId: subject.branchId,
        semesterId: subject.semesterId,
        subjectId: subject.subjectId
      }
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
}

export async function updateAcademicSubject(req, res, next) {
  try {
    const payload = validateAcademicSubjectPayload(req.body);
    const subjectRecordId = readMongoId(req.params.subjectRecordId, { field: "subjectRecordId" });
    const subject = await AcademicSubject.findById(subjectRecordId);

    if (!subject) {
      throw createHttpError("Academic subject not found.", 404);
    }

    Object.assign(subject, payload);
    await subject.save();
    await createAuditLog({
      req,
      action: "admin.update_academic_subject",
      entityType: "academic_subject",
      entityId: subject._id,
      metadata: {
        collegeName: subject.collegeName,
        programId: subject.programId,
        branchId: subject.branchId,
        semesterId: subject.semesterId,
        subjectId: subject.subjectId
      }
    });

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
}

export async function deleteAcademicSubject(req, res, next) {
  try {
    const subjectRecordId = readMongoId(req.params.subjectRecordId, { field: "subjectRecordId" });
    const subject = await AcademicSubject.findById(subjectRecordId);

    if (!subject) {
      throw createHttpError("Academic subject not found.", 404);
    }

    await subject.deleteOne();
    await createAuditLog({
      req,
      action: "admin.delete_academic_subject",
      entityType: "academic_subject",
      entityId: subject._id,
      metadata: {
        collegeName: subject.collegeName,
        programId: subject.programId,
        branchId: subject.branchId,
        semesterId: subject.semesterId,
        subjectId: subject.subjectId
      }
    });
    res.json({ success: true, message: "Academic subject deleted successfully." });
  } catch (error) {
    next(error);
  }
}
