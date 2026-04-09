import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_REF_PREFIX = "s3://";
const DEFAULT_UPLOAD_EXPIRES_IN = 60 * 5;
const DEFAULT_READ_EXPIRES_IN = 60 * 15;

type StorageScope = "clinic-logo" | "medical-attachment" | "user-avatar";

type StorageConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle: boolean;
  uploadExpiresIn: number;
  readExpiresIn: number;
};

type CreateUploadUrlParams = {
  clinicId: number;
  fileName: string;
  fileType?: string | null;
  scope: StorageScope;
  visitId?: number | null;
};

let cachedClient: S3Client | null = null;
let cachedConfig: StorageConfig | null = null;

function readStorageConfig(): StorageConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  const missing = [
    !bucket ? "S3_BUCKET" : null,
    !region ? "S3_REGION" : null,
    !accessKeyId ? "S3_ACCESS_KEY_ID" : null,
    !secretAccessKey ? "S3_SECRET_ACCESS_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno para S3: ${missing.join(", ")}`
    );
  }

  cachedConfig = {
    bucket: bucket!,
    region: region!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    uploadExpiresIn: Number(
      process.env.S3_UPLOAD_URL_EXPIRES_IN ?? DEFAULT_UPLOAD_EXPIRES_IN
    ),
    readExpiresIn: Number(
      process.env.S3_READ_URL_EXPIRES_IN ?? DEFAULT_READ_EXPIRES_IN
    ),
  };

  return cachedConfig;
}

function getS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = readStorageConfig();

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

function sanitizeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function sanitizeFileName(fileName: string) {
  const original = fileName.trim() || "archivo";
  const ext = path.extname(original).slice(0, 20);
  const base = original.slice(0, original.length - ext.length) || "archivo";
  const safeBase = sanitizeSegment(base) || "archivo";
  const safeExt = sanitizeSegment(ext).replace(/^\.+/, "");

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

function guessContentType(fileType?: string | null) {
  const trimmed = fileType?.trim();
  return trimmed || "application/octet-stream";
}

function buildStorageKey(params: CreateUploadUrlParams) {
  const safeFileName = sanitizeFileName(params.fileName);
  const prefix =
    params.scope === "clinic-logo"
      ? `clinic/${params.clinicId}/branding`
      : params.scope === "user-avatar"
        ? `clinic/${params.clinicId}/users/avatars`
      : `clinic/${params.clinicId}/visits/${params.visitId}/attachments`;

  return `${prefix}/${randomUUID()}-${safeFileName}`;
}

function quoteFileName(fileName: string) {
  return fileName.replace(/"/g, "");
}

export function isS3StorageRef(value?: string | null) {
  return typeof value === "string" && value.startsWith(S3_REF_PREFIX);
}

export function toS3StorageRef(key: string) {
  return `${S3_REF_PREFIX}${key}`;
}

export function fromS3StorageRef(ref: string) {
  if (!isS3StorageRef(ref)) {
    throw new Error("Referencia S3 inválida");
  }

  return ref.slice(S3_REF_PREFIX.length);
}

export function storageRefBelongsToClinic(ref: string, clinicId: number) {
  if (!isS3StorageRef(ref)) {
    return false;
  }

  return fromS3StorageRef(ref).startsWith(`clinic/${clinicId}/`);
}

export async function createSignedUploadUrl(params: CreateUploadUrlParams) {
  const config = readStorageConfig();
  const client = getS3Client();
  const key = buildStorageKey(params);
  const contentType = guessContentType(params.fileType);

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: config.uploadExpiresIn }
  );

  return {
    uploadUrl,
    storageRef: toS3StorageRef(key),
    key,
    contentType,
    expiresIn: config.uploadExpiresIn,
  };
}

export async function resolveStoredFileUrl(
  ref?: string | null,
  options?: {
    download?: boolean;
    fileName?: string | null;
    expiresIn?: number;
  }
) {
  if (!ref) {
    return null;
  }

  if (!isS3StorageRef(ref)) {
    return ref;
  }

  const config = readStorageConfig();
  const client = getS3Client();
  const key = fromS3StorageRef(ref);
  const fileName = options?.fileName?.trim();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ResponseContentDisposition:
        fileName && options?.download
          ? `attachment; filename="${quoteFileName(fileName)}"`
          : fileName
            ? `inline; filename="${quoteFileName(fileName)}"`
            : undefined,
    }),
    { expiresIn: options?.expiresIn ?? config.readExpiresIn }
  );
}

export async function deleteStoredFile(ref?: string | null) {
  if (!ref || !isS3StorageRef(ref)) {
    return;
  }

  const config = readStorageConfig();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: fromS3StorageRef(ref),
    })
  );
}

export async function serializeAttachment<T extends { fileName: string; fileType?: string | null; url: string }>(
  attachment: T
) {
  const storageRef = attachment.url;

  return {
    ...attachment,
    storageRef,
    url: await resolveStoredFileUrl(storageRef, {
      fileName: attachment.fileName,
    }),
    downloadUrl: await resolveStoredFileUrl(storageRef, {
      download: true,
      fileName: attachment.fileName,
    }),
  };
}
