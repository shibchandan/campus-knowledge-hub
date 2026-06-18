function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function validateCollegeRequestPayload(payload) {
  const collegeName = payload.collegeName?.trim();
  const courseName = payload.courseName?.trim();
  const hasSemesterCount =
    payload.semesterCount !== undefined &&
    payload.semesterCount !== null &&
    String(payload.semesterCount).trim() !== "";
  const semesterCount = hasSemesterCount ? Number(payload.semesterCount) : null;

  if (!collegeName || collegeName.length < 3) {
    throw createHttpError("College name must be at least 3 characters.");
  }

  if (!courseName || courseName.length < 2) {
    throw createHttpError("Course name must be at least 2 characters.");
  }

  if (
    hasSemesterCount &&
    (!Number.isInteger(semesterCount) || semesterCount < 1 || semesterCount > 12)
  ) {
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

  const cutOffListRaw = Array.isArray(payload.cutOffList)
    ? payload.cutOffList.map(item => ({
        branch: String(item.branch || "").trim(),
        value: String(item.value || "").trim()
      })).filter(item => item.branch || item.value)
    : [];

  const placementListRaw = Array.isArray(payload.placementList)
    ? payload.placementList.map(item => ({
        branch: String(item.branch || "").trim(),
        value: String(item.value || "").trim()
      })).filter(item => item.branch || item.value)
    : [];

  // Serialize lists into markdown tables for backward compatibility
  let cutOffSummary = payload.cutOffSummary?.toString().trim() || "";
  if (cutOffListRaw.length > 0) {
    cutOffSummary = `| Branch | Cut-off |\n| --- | --- |\n` +
      cutOffListRaw.map(item => `| ${item.branch} | ${item.value} |`).join("\n");
  }

  let placementReport = payload.placementReport?.toString().trim() || "";
  if (placementListRaw.length > 0) {
    placementReport = `| Branch | Avg/Highest Package |\n| --- | --- |\n` +
      placementListRaw.map(item => `| ${item.branch} | ${item.value} |`).join("\n");
  }

  return {
    collegeName,
    courseId: payload.courseId?.toString().trim() || "overall",
    location: payload.location?.toString().trim() || "",
    entranceExams: entranceExamsRaw,
    rankings: {
      nirf: payload.rankings?.nirf?.toString().trim() || "",
      qs: payload.rankings?.qs?.toString().trim() || "",
      other: payload.rankings?.other?.toString().trim() || ""
    },
    cutOffSummary,
    placementReport,
    placementReportUrl: payload.placementReportUrl?.toString().trim() || "",
    averagePackageLpa: payload.averagePackageLpa?.toString().trim() || "",
    highestPackageLpa: payload.highestPackageLpa?.toString().trim() || "",
    cutOffList: cutOffListRaw,
    placementList: placementListRaw
  };
}

export function validateTransferRepresentativePayload(payload) {
  const targetUserEmail = payload.targetUserEmail?.trim().toLowerCase();

  if (!targetUserEmail) {
    throw createHttpError("Target user email is required for transferring representative rights.");
  }

  // Basic email format validation
  if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(targetUserEmail)) {
    throw createHttpError("Invalid email format.");
  }

  return { targetUserEmail };
}
