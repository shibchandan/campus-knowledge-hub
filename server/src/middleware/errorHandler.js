export function errorHandler(error, req, res, _next) {
  const statusCode =
    error.code === "LIMIT_FILE_SIZE"
      ? 413
      : error?.code === 11000
        ? 409
      : error.statusCode || 500;

  // Log the full error context server-side
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id || "unauthenticated",
      statusCode,
      errorMessage: error.message,
      stack: error.stack
    })
  );

  let message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large for this category."
      : error?.code === 11000
        ? "A record with the same unique details already exists."
      : statusCode >= 500
        ? "Something went wrong"
      : error.message || "Something went wrong";

  if (process.env.NODE_ENV === "production") {
    if (
      message.toLowerCase().includes("mongo") ||
      message.toLowerCase().includes("cast to") ||
      message.toLowerCase().includes("validation failed") ||
      message.toLowerCase().includes("e11000")
    ) {
      message = "A processing error occurred with the provided input.";
    }
  }

  const responsePayload = {
    success: false,
    message
  };

  if (process.env.NODE_ENV !== "production") {
    responsePayload.stack = error.stack;
  }

  res.status(statusCode).json(responsePayload);
}
