import fs from "fs";
import crypto from "crypto";
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
    const uniqueId = crypto.randomUUID();
    cb(null, `${uniqueId}${extension}`);
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
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 1
  }
});

const magicSignatures = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]], 
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], 
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4b, 0x03, 0x04]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "application/vnd.ms-powerpoint": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "application/vnd.ms-excel": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "video/mp4": [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]],
  "audio/mpeg": [[0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2], [0x49, 0x44, 0x33]]
};

export async function validateUploadedFile(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) files.push(...req.files);
    else {
      for (const key in req.files) files.push(...req.files[key]);
    }
  }

  if (files.length === 0) return next();

  for (const file of files) {
    const { path: filePath, mimetype } = file;

    try {
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      let isValid = false;
      let requiredSignatures = [];

      for (const [key, sigs] of Object.entries(magicSignatures)) {
        if (mimetype === key || mimetype.startsWith(key.replace(/\/.*/, "/"))) {
          requiredSignatures = sigs;
          break;
        }
      }

      if (requiredSignatures.length > 0) {
        for (const sig of requiredSignatures) {
          let match = true;
          for (let i = 0; i < sig.length; i++) {
            if (buffer[i] !== sig[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            isValid = true;
            break;
          }
        }

        if (!isValid) {
          fs.unlinkSync(filePath);
          const error = new Error("File magic number does not match expected MIME type.");
          error.statusCode = 400;
          return next(error);
        }
      }
    } catch (error) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const err = new Error("Error validating file content.");
      err.statusCode = 500;
      return next(err);
    }
  }
  next();
}

export { uploadDirectory };
