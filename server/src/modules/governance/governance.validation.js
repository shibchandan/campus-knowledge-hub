function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function validateCollegeRequestPayload(payload) {
  const collegeName = payload.collegeName?.trim();
  const courseName = payload.courseName?.trim();
  const semesterCount = Number(payload.semesterCount);

  if (!collegeName || collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters.");
  }

  if (!courseName || courseName.length < 2) {
    throw createHttpError("Course name must be at least 2 characters.");
  }

  if (!Number.isInteger(semesterCount) || semesterCount < 1 || semesterCount > 12) {
    throw createHttpError("Semester count must be a whole number between 1 and 12.");
  }

  return { collegeName, courseName, semesterCount };
}

export function validateAdminDecisionPayload(payload) {
  const action = payload.action?.trim().toLowerCase();
  const decisionNote = payload.decisionNote?.trim() || "";

  if (!["approve", "reject"].includes(action)) {
    throw createHttpError("Action must be either approve or reject.");
  }

  return { action, decisionNote };
}

export function validateCollegeProfilePayload(payload) {
  const collegeName = payload.collegeName?.trim();

  if (!collegeName || collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters.");
  }

  const entranceExamsRaw = Array.isArray(payload.entranceExams)
    ? payload.entranceExams
    : String(payload.entranceExams || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    collegeName,
    entranceExams: entranceExamsRaw,
    rankings: {
      nirf: payload.rankings?.nirf?.toString().trim() || "",
      qs: payload.rankings?.qs?.toString().trim() || "",
      other: payload.rankings?.other?.toString().trim() || ""
    },
    cutOffSummary: payload.cutOffSummary?.toString().trim() || "",
    placementReport: payload.placementReport?.toString().trim() || "",
    placementReportUrl: payload.placementReportUrl?.toString().trim() || "",
    averagePackageLpa: payload.averagePackageLpa?.toString().trim() || "",
    highestPackageLpa: payload.highestPackageLpa?.toString().trim() || ""
  };
}
