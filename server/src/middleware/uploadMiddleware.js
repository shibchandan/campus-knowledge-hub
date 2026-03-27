import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    const safeOriginal = `${baseName || "file"}${extension}`;
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const blockedExtensions = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".sh",
  ".js",
  ".mjs",
  ".cjs",
  ".php",
  ".jar",
  ".apk"
]);

const allowedMimeMatchers = [
  /^video\//i,
  /^audio\//i,
  /^image\//i,
  /^text\//i,
  /^application\/pdf$/i,
  /^application\/msword$/i,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
  /^application\/vnd\.ms-powerpoint$/i,
  /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/i,
  /^application\/vnd\.ms-excel$/i,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/i
];

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isMimeAllowed = allowedMimeMatchers.some((pattern) => pattern.test(file.mimetype || ""));

    if (blockedExtensions.has(extension) || !isMimeAllowed) {
      const error = new Error("This file type is not allowed for upload.");
      error.statusCode = 400;
      cb(error);
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 250 * 1024 * 1024,
    files: 1
  }
});

export { uploadDirectory };
