import {
  createHttpError,
  normalizeCollegeName,
  readString
} from "./requestValidation.js";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function requireStudentAssignedCollege(req, options = {}) {
  if (req.user?.role !== "student") {
    return { collegeName: "", collegeNameNormalized: "" };
  }

  const verificationStatus = req.user?.studentVerificationStatus || "none";

  if (verificationStatus !== "verified") {
    const waitingMessage =
      verificationStatus === "rejected"
        ? "Your student college ID verification was rejected. Contact admin to update your college details."
        : "Your student account is waiting for admin college ID verification.";
    throw createHttpError(
      options.unverifiedMessage || waitingMessage,
      403
    );
  }

  const collegeName = readString(req.user?.collegeName, {
    field: "Assigned college",
    min: 3,
    max: 120,
    required: false
  });

  if (!collegeName) {
    throw createHttpError(
      options.unassignedMessage ||
        "Your student account is not assigned to a college yet. Ask admin to assign your college.",
      403
    );
  }

  return {
    collegeName,
    collegeNameNormalized: normalizeCollegeName(collegeName)
  };
}

export function resolveStudentCollegeScope(req, requestedCollegeName, options = {}) {
  const assigned = requireStudentAssignedCollege(req, options);

  if (req.user?.role !== "student") {
    const collegeName = requestedCollegeName
      ? readString(requestedCollegeName, {
          field: "collegeName",
          min: 3,
          max: 120
        })
      : "";

    return {
      collegeName,
      collegeNameNormalized: collegeName ? normalizeCollegeName(collegeName) : "",
      isStudentScoped: false
    };
  }

  const requested = requestedCollegeName
    ? readString(requestedCollegeName, {
        field: "collegeName",
        min: 3,
        max: 120
      })
    : "";

  if (
    requested &&
    normalizeCollegeName(requested) !== assigned.collegeNameNormalized
  ) {
    throw createHttpError(
      options.mismatchMessage ||
        "Students can access data only for their assigned college.",
      403
    );
  }

  return {
    collegeName: requested || assigned.collegeName,
    collegeNameNormalized: assigned.collegeNameNormalized,
    isStudentScoped: true
  };
}

export function buildCollegeNameRegex(collegeName) {
  const normalized = normalizeCollegeName(collegeName);

  if (!normalized) {
    return null;
  }

  const pattern = normalized
    .split(" ")
    .map((part) => escapeRegex(part))
    .join("\\s+");

  return new RegExp(`^${pattern}$`, "i");
}

export function collegeNameMatches(leftCollegeName, rightCollegeName) {
  return normalizeCollegeName(leftCollegeName) === normalizeCollegeName(rightCollegeName);
}

export function normalizeCourseAccessKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
