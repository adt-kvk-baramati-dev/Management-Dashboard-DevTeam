import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getRequester } from "../services/auth";
import {
  createS3ClientFromEnv, buildS3PublicUrl, guessFileExtension,
  getAwsRegion, getS3Bucket, getS3Prefix, PutObjectCommand, getSignedUrl
} from "../services/s3";
import { requireEnvValue } from "../config/env";
import type { S3UploadPurpose } from "../types";

const router = Router();
const s3UploadParser = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/s3/upload (direct server upload)
router.post("/upload", s3UploadParser.single("file"), async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const region = getAwsRegion();
    const bucket = getS3Bucket();
    requireEnvValue(region, "AWS_REGION");
    requireEnvValue(bucket, "AWS_S3_BUCKET");

    const file = (req as any).file as { mimetype?: string; originalname?: string; buffer: Buffer } | undefined;
    if (!file) return res.status(400).json({ message: "Missing file" });

    const purposeRaw = String(req.body?.purpose ?? "generic").trim();
    const purpose: S3UploadPurpose = ["profile", "outreach", "complaint", "field-visit", "generic"].includes(purposeRaw)
      ? (purposeRaw as S3UploadPurpose) : "generic";

    const isDocumentUpload = purpose === "outreach";
    if (!isDocumentUpload && !file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }

    const prefix = getS3Prefix();
    const date = new Date().toISOString().slice(0, 10);
    const ext = guessFileExtension(file.mimetype, file.originalname);
    const key = `${prefix}/${purpose}/${date}/${randomUUID()}${ext}`;

    const s3 = createS3ClientFromEnv();
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
      Metadata: { uploaded_by: requester.userId, purpose },
    }));

    const publicUrl = buildS3PublicUrl(key);
    return res.json({ key, publicUrl });
  } catch (error: any) {
    console.error("S3 direct upload error:", error);
    if (String(error?.message ?? "").includes("Could not load credentials from any providers")) {
      return res.status(500).json({ message: "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure an IAM role for the server." });
    }
    return res.status(500).json({ message: error?.message ?? "Failed to upload file" });
  }
});

// POST /api/s3/presign
router.post("/presign", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const region = getAwsRegion();
    const bucket = getS3Bucket();
    requireEnvValue(region, "AWS_REGION");
    requireEnvValue(bucket, "AWS_S3_BUCKET");

    const purposeRaw = String(req.body?.purpose ?? "generic").trim();
    const purpose: S3UploadPurpose = ["profile", "outreach", "complaint", "field-visit", "generic"].includes(purposeRaw)
      ? (purposeRaw as S3UploadPurpose) : "generic";

    const contentType = String(req.body?.contentType ?? "").trim();
    const isDocumentUpload = purpose === "outreach";
    if (!contentType || (!contentType.startsWith("image/") && !isDocumentUpload)) {
      return res.status(400).json({ message: "Invalid contentType. Only image uploads are supported." });
    }

    const contentLength = Number(req.body?.contentLength ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      if (contentLength > 5 * 1024 * 1024) return res.status(400).json({ message: "File too large. Max size is 5MB." });
    }

    const fileName = String(req.body?.fileName ?? "").trim();
    const prefix = getS3Prefix();
    const date = new Date().toISOString().slice(0, 10);
    const ext = guessFileExtension(contentType, fileName);
    const key = `${prefix}/${purpose}/${date}/${randomUUID()}${ext}`;

    const s3 = createS3ClientFromEnv();
    let uploadUrl = "";
    try {
      uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
        Bucket: bucket, Key: key, ContentType: contentType,
        Metadata: { uploaded_by: requester.userId, purpose },
      }), { expiresIn: 60 });
    } catch (error: any) {
      if (String(error?.message ?? "").includes("Could not load credentials from any providers")) {
        return res.status(500).json({ message: "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure an IAM role for the server." });
      }
      throw error;
    }

    const publicUrl = buildS3PublicUrl(key);
    return res.json({ key, uploadUrl, publicUrl, expiresInSeconds: 60 });
  } catch (error: any) {
    console.error("S3 presign error:", error);
    return res.status(500).json({ message: error?.message ?? "Failed to generate upload URL" });
  }
});

export default router;
