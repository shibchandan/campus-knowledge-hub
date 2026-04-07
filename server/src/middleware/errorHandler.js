export function errorHandler(error, _req, res, _next) {
  const statusCode =
    error.code === "LIMIT_FILE_SIZE"
      ? 413
      : error?.code === 11000
        ? 409
      : error.statusCode || 500;
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large for this category."
      : error?.code === 11000
        ? "A record with the same unique details already exists."
      : error.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message
  });
}
