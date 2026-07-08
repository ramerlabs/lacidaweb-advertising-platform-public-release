import { NextResponse } from "next/server";
import { processWebhookEvent, verifyZernioSignature } from "@/services/inbox";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-zernio-signature");

  if (!(await verifyZernioSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge quickly; processing is inline but designed to be fast.
  try {
    const result = await processWebhookEvent(payload);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[webhook]", error);
    // Still 200 after accept if we want retry suppression; return 500 to allow Zernio retry.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
