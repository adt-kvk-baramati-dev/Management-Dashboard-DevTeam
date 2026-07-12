// All environment variable accessors are here.
// No side effects — pure reads only.

export function getMongoUri(): string {
  return process.env.MONGODB_URI ?? "";
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME ?? "kvk_portal";
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "";
}

export function getAwsRegion(): string {
  return String(process.env.AWS_REGION ?? "").trim();
}

export function getAwsAccessKeyId(): string {
  return String(process.env.AWS_ACCESS_KEY_ID ?? "").trim();
}

export function getAwsSecretAccessKey(): string {
  return String(process.env.AWS_SECRET_ACCESS_KEY ?? "").trim();
}

export function getAwsSessionToken(): string {
  return String(process.env.AWS_SESSION_TOKEN ?? "").trim();
}

export function getS3Bucket(): string {
  return String(process.env.AWS_S3_BUCKET ?? "").trim();
}

export function getS3Prefix(): string {
  const raw = String(process.env.AWS_S3_PREFIX ?? "uploads").trim();
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function getS3PublicBaseUrl(): string {
  const raw = String(process.env.AWS_S3_PUBLIC_BASE_URL ?? "").trim();
  return raw.replace(/\/+$/, "");
}

export function requireEnvValue(value: string, key: string): void {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
