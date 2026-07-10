import { NextResponse } from "next/server";
import { readLocalUpload } from "@/lib/local-media";

export async function GET(req: Request) {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }

    const { buffer, contentType } = await readLocalUpload(key);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
