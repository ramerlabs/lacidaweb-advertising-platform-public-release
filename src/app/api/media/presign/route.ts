import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createLocalUploadSlot } from "@/lib/local-media";

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = schema.parse(await req.json());
    const urls = await createLocalUploadSlot(body);
    return NextResponse.json(urls);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload URL failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
