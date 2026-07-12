import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getAwsRegion, getAwsAccessKeyId, getAwsSecretAccessKey,
  getAwsSessionToken, getS3Bucket, getS3Prefix, getS3PublicBaseUrl,
} from "../config/env";
import type { S3UploadPurpose } from "../types";

export function guessFileExtension(contentType: string, fileName?: string): string {
  const name = String(fileName ?? "").trim();
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot >= 0 ? name.slice(lastDot) : "";
  const safeExt = /^\.[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : "";
  if (safeExt) return safeExt;
  switch (contentType) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    case "image/heic": return ".heic";
    case "image/heif": return ".heif";
    default: return "";
  }
}

export function buildS3PublicUrl(key: string): string {
  const baseUrl = getS3PublicBaseUrl();
  if (baseUrl) return `${baseUrl}/${key}`;
  const bucket = getS3Bucket();
  const region = getAwsRegion();
  if (!bucket || !region) return "";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function createS3ClientFromEnv(): S3Client {
  const region = getAwsRegion();
  const accessKeyId = getAwsAccessKeyId();
  const secretAccessKey = getAwsSecretAccessKey();
  const sessionToken = getAwsSessionToken();
  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) },
    });
  }
  return new S3Client({ region });
}

export { PutObjectCommand, getSignedUrl, getS3Bucket, getAwsRegion, getS3Prefix };
export type { S3UploadPurpose };
