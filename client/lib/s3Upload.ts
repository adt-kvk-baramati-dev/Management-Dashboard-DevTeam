import type { S3UploadPurpose } from "@shared/api";

type UploadFileToS3Args = {
  file: File;
  token: string;
  purpose?: S3UploadPurpose;
  allowNonImage?: boolean;
};

export async function uploadFileToS3({
  file,
  token,
  purpose = "generic",
  allowNonImage = false,
}: UploadFileToS3Args): Promise<string> {
  if (!token) {
    throw new Error("Session expired. Please login again.");
  }

  if (!allowNonImage && !file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const uploadRes = await fetch("/api/s3/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadBody = (await uploadRes
    .json()
    .catch(() => ({}))) as { key?: string; publicUrl?: string; message?: string };

  if (!uploadRes.ok) {
    throw new Error(
      uploadBody?.message ||
        `Upload failed (${uploadRes.status})`,
    );
  }

  if (!uploadBody.publicUrl) {
    throw new Error("Upload succeeded but no public URL was returned");
  }

  return uploadBody.publicUrl;
}

export async function uploadImageToS3(args: Omit<UploadFileToS3Args, "allowNonImage">): Promise<string> {
  return uploadFileToS3(args);
}

export async function uploadImagesToS3(args: {
  files: File[];
  token: string;
  purpose?: S3UploadPurpose;
}): Promise<string[]> {
  const { files, token, purpose } = args;
  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadImageToS3({ file, token, purpose });
    urls.push(url);
  }

  return urls;
}

export async function uploadFilesToS3(args: {
  files: File[];
  token: string;
  purpose?: S3UploadPurpose;
}): Promise<string[]> {
  const { files, token, purpose } = args;
  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadFileToS3({ file, token, purpose, allowNonImage: true });
    urls.push(url);
  }

  return urls;
}
