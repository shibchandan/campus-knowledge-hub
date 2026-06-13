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

  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large for this category."
      : error?.code === 11000
        ? "A record with the same unique details already exists."
      : statusCode >= 500
        ? "Something went wrong"
      : error.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    message
  });
}
