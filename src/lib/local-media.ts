import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";

function resolveUploadDir() {
  // Vercel / serverless: public/ is read-only at runtime — use /tmp.
  if (process.env.VERCEL || process.env.LACIDAWEB_UPLOAD_DIR === "tmp") {
    return path.join("/tmp", "lacidaweb-uploads");
  }
  if (process.env.LACIDAWEB_UPLOAD_DIR) {
    return path.resolve(process.env.LACIDAWEB_UPLOAD_DIR);
  }
  return path.join(process.cwd(), "public", "uploads");
}

const UPLOAD_DIR = resolveUploadDir();
const USE_API_SERVE = Boolean(process.env.VERCEL || process.env.LACIDAWEB_UPLOAD_DIR === "tmp");

function safeExt(filename: string, contentType: string): string {
  const fromName = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("webm")) return ".webm";
  return ".jpg";
}

function publicUrlForKey(key: string): string {
  if (USE_API_SERVE) return `/api/media/file?key=${encodeURIComponent(key)}`;
  return `/uploads/${key}`;
}

/** Create a local upload slot under /public/uploads (or /tmp on serverless). */
export async function createLocalUploadSlot(input: {
  filename: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const key = `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt(input.filename, input.contentType)}`;
  return {
    key,
    uploadUrl: `/api/media/put?key=${encodeURIComponent(key)}`,
    publicUrl: publicUrlForKey(key),
  };
}

export async function saveLocalUpload(key: string, data: Buffer) {
  const safeKey = path.basename(key);
  if (!safeKey || safeKey !== key || key.includes("..")) {
    throw new Error("Invalid upload key");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safeKey), data);
  return publicUrlForKey(safeKey);
}

export async function readLocalUpload(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const safeKey = path.basename(key);
  if (!safeKey || safeKey !== key || key.includes("..")) {
    throw new Error("Invalid upload key");
  }
  const filePath = path.join(UPLOAD_DIR, safeKey);
  await access(filePath, fsConstants.R_OK);
  const buffer = await readFile(filePath);
  const ext = path.extname(safeKey).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".mp4"
            ? "video/mp4"
            : ext === ".webm"
              ? "video/webm"
              : "image/jpeg";
  return { buffer, contentType };
}
