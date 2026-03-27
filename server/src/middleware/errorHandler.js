export function errorHandler(error, _req, res, _next) {
  const statusCode =
    error.code === "LIMIT_FILE_SIZE"
      ? 413
      : error.statusCode || 500;
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large for this category."
      : error.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message
  });
}
