import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { saveLocalUpload } from "@/lib/local-media";

export async function PUT(req: Request) {
  try {
    await requireSession();
    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (buffer.length > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    const publicUrl = await saveLocalUpload(key, buffer);
    return NextResponse.json({ publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
