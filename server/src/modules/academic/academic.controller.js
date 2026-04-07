import { AcademicSubject } from "./academic.model.js";
import { AcademicStructure } from "./academicStructure.model.js";
import { CollegeCourse } from "../governance/governance.model.js";
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
import { resolveStudentCollegeScope } from "../../utils/studentCollegeAccess.js";

function normalizeProgramCourse(programId = "", programName = "") {
  return normalizeCollegeName(programName || programId);
}

async function assertRepresentativeCollegeAccess(user, collegeNameNormalized, programId = "", programName = "") {
  if (user.role !== "representative") {
    return;
  }

  const courseNameNormalized = normalizeProgramCourse(programId, programName);
  const approvedCourse = await CollegeCourse.findOne({
    collegeNameNormalized,
    courseNameNormalized,
    addedByRepresentative: user.id
  });

  if (!approvedCourse) {
    throw createHttpError(
      "Representative can manage academic structure only for approved college courses assigned to them.",
      403
    );
  }
}

export async function listAcademicSubjects(req, res, next) {
  try {
    const filters = {};
    const collegeScope = resolveStudentCollegeScope(req, req.query.collegeName, {
      mismatchMessage: "Students can view subjects only for their assigned college."
    });
    if (collegeScope.collegeNameNormalized) {
      filters.collegeNameNormalized = collegeScope.collegeNameNormalized;
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
    const collegeScope = resolveStudentCollegeScope(req, req.query.collegeName, {
      mismatchMessage: "Students can view academic structure only for their assigned college."
    });
    if (collegeScope.collegeNameNormalized) {
      filters.collegeNameNormalized = collegeScope.collegeNameNormalized;
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
    await assertRepresentativeCollegeAccess(
      req.user,
      payload.collegeNameNormalized,
      payload.programId,
      payload.programName
    );
    const structure = await AcademicStructure.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: `${req.user.role}.create_academic_structure`,
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
    const structureId = readMongoId(req.params.structureId, { field: "structureId" });
    const structure = await AcademicStructure.findById(structureId);

    if (!structure) {
      throw createHttpError("Academic structure not found.", 404);
    }

    await assertRepresentativeCollegeAccess(
      req.user,
      structure.collegeNameNormalized,
      structure.programId,
      structure.programName
    );

    const payload = validateAcademicStructurePayload(req.body);
    await assertRepresentativeCollegeAccess(
      req.user,
      payload.collegeNameNormalized,
      payload.programId,
      payload.programName
    );

    Object.assign(structure, payload);
    await structure.save();
    await createAuditLog({
      req,
      action: `${req.user.role}.update_academic_structure`,
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

    await assertRepresentativeCollegeAccess(
      req.user,
      structure.collegeNameNormalized,
      structure.programId,
      structure.programName
    );

    await AcademicSubject.deleteMany({
      collegeNameNormalized: structure.collegeNameNormalized,
      programId: structure.programId,
      branchId: structure.branchId,
      semesterId: structure.semesterId
    });

    await structure.deleteOne();
    await createAuditLog({
      req,
      action: `${req.user.role}.delete_academic_structure`,
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
    await assertRepresentativeCollegeAccess(
      req.user,
      payload.collegeNameNormalized,
      payload.programId
    );
    const subject = await AcademicSubject.create({
      ...payload,
      createdByAdmin: req.user.id
    });
    await createAuditLog({
      req,
      action: `${req.user.role}.create_academic_subject`,
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
    const subjectRecordId = readMongoId(req.params.subjectRecordId, { field: "subjectRecordId" });
    const subject = await AcademicSubject.findById(subjectRecordId);

    if (!subject) {
      throw createHttpError("Academic subject not found.", 404);
    }

    await assertRepresentativeCollegeAccess(
      req.user,
      subject.collegeNameNormalized,
      subject.programId
    );

    const payload = validateAcademicSubjectPayload(req.body);
    await assertRepresentativeCollegeAccess(
      req.user,
      payload.collegeNameNormalized,
      payload.programId
    );

    Object.assign(subject, payload);
    await subject.save();
    await createAuditLog({
      req,
      action: `${req.user.role}.update_academic_subject`,
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

    await assertRepresentativeCollegeAccess(
      req.user,
      subject.collegeNameNormalized,
      subject.programId
    );

    await subject.deleteOne();
    await createAuditLog({
      req,
      action: `${req.user.role}.delete_academic_subject`,
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
