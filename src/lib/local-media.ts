import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

/** Create a local upload slot under /public/uploads. */
export async function createLocalUploadSlot(input: {
  filename: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const key = `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt(input.filename, input.contentType)}`;
  return {
    key,
    uploadUrl: `/api/media/put?key=${encodeURIComponent(key)}`,
    publicUrl: `/uploads/${key}`,
  };
}

export async function saveLocalUpload(key: string, data: Buffer) {
  const safeKey = path.basename(key);
  if (!safeKey || safeKey !== key || key.includes("..")) {
    throw new Error("Invalid upload key");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safeKey), data);
  return `/uploads/${safeKey}`;
}
