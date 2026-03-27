function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function validateNoticePayload(payload) {
  const collegeName = payload.collegeName?.trim() || "";
  const title = payload.title?.trim();
  const content = payload.content?.trim();
  const isPublished = payload.isPublished !== false;

  if (!title || title.length < 3) {
    throw createHttpError("Notice title must be at least 3 characters.");
  }

  if (!content || content.length < 5) {
    throw createHttpError("Notice content must be at least 5 characters.");
  }

  return {
    collegeName,
    collegeNameNormalized: collegeName ? collegeName.toLowerCase().replace(/\s+/g, " ") : "",
    title,
    content,
    isPublished
  };
}
