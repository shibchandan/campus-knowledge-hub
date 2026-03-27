function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function validateAcademicSubjectPayload(payload) {
  const collegeName = payload.collegeName?.trim();
  const programId = payload.programId?.trim();
  const branchId = payload.branchId?.trim();
  const semesterId = payload.semesterId?.trim();
  const name = payload.name?.trim();
  const subjectId = payload.subjectId?.trim() || slugify(name || "");

  if (!collegeName || collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters.");
  }

  if (!programId || !branchId || !semesterId) {
    throw createHttpError("Program, branch, and semester are required.");
  }

  if (!name || name.length < 2) {
    throw createHttpError("Subject name must be at least 2 characters.");
  }

  if (!subjectId) {
    throw createHttpError("Subject id could not be generated.");
  }

  return {
    collegeName,
    collegeNameNormalized: collegeName.toLowerCase().replace(/\s+/g, " "),
    programId,
    branchId,
    semesterId,
    subjectId,
    name
  };
}

export function validateAcademicStructurePayload(payload) {
  const collegeName = payload.collegeName?.trim();
  const programId = payload.programId?.trim();
  const programName = payload.programName?.trim();
  const branchId = payload.branchId?.trim();
  const branchName = payload.branchName?.trim();
  const branchDescription = payload.branchDescription?.trim() || "";
  const semesterId = payload.semesterId?.trim();
  const semesterName = payload.semesterName?.trim();
  const semesterOrder = Number(payload.semesterOrder);

  if (!collegeName || collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters.");
  }

  if (!programId || !programName) {
    throw createHttpError("Program id and program name are required.");
  }

  if (!branchId || !branchName) {
    throw createHttpError("Branch id and branch name are required.");
  }

  if (!semesterId || !semesterName) {
    throw createHttpError("Semester id and semester name are required.");
  }

  if (!Number.isInteger(semesterOrder) || semesterOrder < 1 || semesterOrder > 20) {
    throw createHttpError("Semester order must be a whole number between 1 and 20.");
  }

  return {
    collegeName,
    collegeNameNormalized: collegeName.toLowerCase().replace(/\s+/g, " "),
    programId,
    programName,
    branchId,
    branchName,
    branchDescription,
    semesterId,
    semesterName,
    semesterOrder
  };
}
