import { NextResponse } from "next/server";
import { processWebhookEvent, verifyZernioSignature, extractWebhookSignature } from "@/services/inbox";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = extractWebhookSignature(req);

  if (!(await verifyZernioSignature(rawBody, signature))) {
    return NextResponse.json(
      { error: "Invalid signature — webhook secret must match Zernio and Admin → Integrations" },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await processWebhookEvent(payload);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[webhook]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
