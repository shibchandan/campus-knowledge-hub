import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { uploadDirectory } from "../middleware/uploadMiddleware.js";

function cloudflareR2Configured() {
  return Boolean(
    env.r2Endpoint &&
      env.r2BucketName &&
      env.r2AccessKeyId &&
      env.r2SecretAccessKey &&
      env.r2PublicBaseUrl
  );
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: env.r2Endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey
    }
  });
}

function buildObjectKey(file) {
  const extension = path.extname(file.originalname || file.filename || "").toLowerCase();
  const cleanExt = extension && extension.length <= 10 ? extension : "";
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `${env.r2Folder}/${datePrefix}/${randomUUID()}${cleanExt}`;
}

export async function storeUploadedFile(file) {
  if (!file) {
    return {
      storageProvider: "none",
      fileOriginalName: "",
      fileStoredName: "",
      fileMimeType: "",
      fileSize: 0,
      fileUrl: "",
      previewUrl: "",
      cloudObjectKey: ""
    };
  }

  if (!cloudflareR2Configured()) {
    return {
      storageProvider: "local",
      fileOriginalName: file.originalname,
      fileStoredName: file.filename,
      fileMimeType: file.mimetype,
      fileSize: file.size,
      fileUrl: "",
      previewUrl: "",
      cloudObjectKey: ""
    };
  }

  const objectKey = buildObjectKey(file);
  const fileBuffer = await fs.readFile(file.path);
  const client = createR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.r2BucketName,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: file.mimetype
    })
  );
  await fs.unlink(file.path).catch(() => {});
  const publicUrl = `${env.r2PublicBaseUrl.replace(/\/$/, "")}/${objectKey}`;

  return {
    storageProvider: "cloudflare-r2",
    fileOriginalName: file.originalname,
    fileStoredName: file.filename,
    fileMimeType: file.mimetype,
    fileSize: file.size,
    fileUrl: publicUrl,
    previewUrl: publicUrl,
    cloudObjectKey: objectKey
  };
}

export async function removeStoredFile(resource) {
  if (!resource?.fileStoredName && !resource?.cloudObjectKey) {
    return;
  }

  if (resource.storageProvider === "cloudflare-r2" && cloudflareR2Configured()) {
    const objectKey = resource.cloudObjectKey;
    if (!objectKey) {
      return;
    }

    const client = createR2Client();
    await client
      .send(
        new DeleteObjectCommand({
          Bucket: env.r2BucketName,
          Key: objectKey
        })
      )
      .catch(() => {});
    return;
  }

  const filePath = path.resolve(uploadDirectory, resource.fileStoredName);
  await fs.unlink(filePath).catch(() => {});
}
