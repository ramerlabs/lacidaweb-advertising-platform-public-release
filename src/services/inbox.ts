import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getZernioWebhookSecret } from "@/lib/integration-settings";
import { getZernio, withZernioRetry } from "@/lib/zernio";

export async function verifyZernioSignature(rawBody: string, signatureHeader: string | null) {
  const secret = await getZernioWebhookSecret();
  if (!secret) {
    console.warn("[webhook] ZERNIO_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }

  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WebhookPayload = {
  id?: string;
  eventId?: string;
  type?: string;
  event?: string;
  eventType?: string;
  data?: Record<string, unknown>;
  comment?: Record<string, unknown>;
  message?: Record<string, unknown>;
  accountId?: string;
  profileId?: string;
  platform?: string;
  [key: string]: unknown;
};

export async function processWebhookEvent(payload: WebhookPayload) {
  const eventType = String(payload.type || payload.event || payload.eventType || "unknown");
  const eventId = String(payload.id || payload.eventId || `${eventType}-${Date.now()}`);

  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existing?.processed) {
    return { skipped: true, reason: "duplicate" };
  }

  const accountId = String(
    payload.accountId ||
      payload.data?.accountId ||
      payload.comment?.accountId ||
      payload.message?.accountId ||
      "",
  );

  const connected = accountId
    ? await prisma.connectedAccount.findUnique({ where: { zernioAccountId: accountId } })
    : null;

  const teamId = connected?.teamId ?? null;

  const stored = await prisma.webhookEvent.upsert({
    where: { eventId },
    create: {
      eventId,
      eventType,
      payload: payload as object,
      teamId,
      processed: false,
    },
    update: {
      payload: payload as object,
      teamId,
    },
  });

  try {
    if (eventType === "comment.received") {
      await handleCommentReceived(payload, connected?.id ?? null, teamId);
    } else if (eventType === "message.received") {
      await handleMessageReceived(payload, connected?.id ?? null, teamId);
    } else if (eventType.startsWith("post.")) {
      await handlePostLifecycle(payload, teamId);
    } else if (eventType === "ad.status_changed") {
      const { handleAdStatusChanged } = await import("@/services/ads");
      await handleAdStatusChanged(payload as Record<string, unknown>);
    }

    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processed: true, processedAt: new Date(), error: null },
    });

    return { ok: true, eventType };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { error: message },
    });
    throw error;
  }
}

async function handleCommentReceived(
  payload: WebhookPayload,
  connectedAccountId: string | null,
  teamId: string | null,
) {
  if (!teamId) return;

  const comment = (payload.comment || payload.data || {}) as Record<string, unknown>;
  const externalId = String(comment.id || comment.commentId || payload.id || "");
  const content = String(comment.text || comment.content || comment.message || "");
  const platform = String(payload.platform || comment.platform || "unknown");

  if (!externalId) return;

  const item = await prisma.inboxItem.upsert({
    where: { teamId_externalId: { teamId, externalId } },
    create: {
      teamId,
      connectedAccountId,
      type: "COMMENT",
      platform,
      externalId,
      conversationId: String(comment.postId || comment.platformPostId || "") || null,
      authorName: String(comment.authorName || comment.username || "") || null,
      authorHandle: String(comment.username || comment.authorHandle || "") || null,
      content,
      metadata: comment as object,
      receivedAt: new Date(),
    },
    update: {
      content,
      metadata: comment as object,
      status: "UNREAD",
    },
  });

  await maybeAutoReply({
    teamId,
    platform,
    content,
    inboxItemId: item.id,
    comment,
    connectedAccountId,
  });
}

async function handleMessageReceived(
  payload: WebhookPayload,
  connectedAccountId: string | null,
  teamId: string | null,
) {
  if (!teamId) return;

  const message = (payload.message || payload.data || {}) as Record<string, unknown>;
  const externalId = String(message.id || message.messageId || payload.id || "");
  const content = String(message.text || message.content || message.body || "");
  const platform = String(payload.platform || message.platform || "unknown");

  if (!externalId) return;

  await prisma.inboxItem.upsert({
    where: { teamId_externalId: { teamId, externalId } },
    create: {
      teamId,
      connectedAccountId,
      type: "MESSAGE",
      platform,
      externalId,
      conversationId: String(message.conversationId || message.threadId || "") || null,
      authorName: String(message.authorName || message.fromName || "") || null,
      authorHandle: String(message.from || message.username || "") || null,
      content,
      metadata: message as object,
      receivedAt: new Date(),
    },
    update: {
      content,
      metadata: message as object,
      status: "UNREAD",
    },
  });
}

async function handlePostLifecycle(payload: WebhookPayload, teamId: string | null) {
  const data = (payload.data || payload) as Record<string, unknown>;
  const zernioPostId = String(data.postId || data._id || data.id || "");
  if (!zernioPostId) return;

  const post = await prisma.post.findFirst({
    where: {
      zernioPostId,
      ...(teamId ? { teamId } : {}),
    },
  });
  if (!post) return;

  const eventType = String(payload.type || payload.event || "");
  if (eventType.includes("published") || eventType.includes("succeeded")) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  } else if (eventType.includes("failed")) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "FAILED",
        errorMessage: String(data.error || data.message || "Remote publish failed"),
      },
    });
  }
}

async function maybeAutoReply(input: {
  teamId: string;
  platform: string;
  content: string;
  inboxItemId: string;
  comment: Record<string, unknown>;
  connectedAccountId: string | null;
}) {
  const rules = await prisma.autoReplyRule.findMany({
    where: { teamId: input.teamId, isActive: true },
  });

  const contentLower = input.content.toLowerCase();

  const matched = rules.find((rule) => {
    if (rule.platforms.length > 0 && !rule.platforms.includes(input.platform)) {
      return false;
    }

    const hits = rule.keywords.filter((kw) => contentLower.includes(kw.toLowerCase()));
    if (rule.matchMode === "all") {
      return hits.length === rule.keywords.length && rule.keywords.length > 0;
    }
    return hits.length > 0;
  });

  if (!matched) return;

  const zernio = await getZernio();
  const commentId = String(input.comment.id || input.comment.commentId || "");

  try {
    if (matched.replyType === "dm") {
      await withZernioRetry(
        async () =>
          zernio.comments.sendPrivateReplyToComment({
            // @ts-ignore SDK version variance
            path: { commentId },
            body: { text: matched.replyTemplate },
            commentId,
            text: matched.replyTemplate,
          }),
        { label: "comments.sendPrivateReplyToComment" },
      );
    } else {
      await withZernioRetry(
        async () =>
          zernio.comments.replyToInboxPost({
            // @ts-ignore SDK version variance
            path: { commentId },
            body: { text: matched.replyTemplate },
            commentId,
            text: matched.replyTemplate,
          }),
        { label: "comments.replyToInboxPost" },
      );
    }

    await prisma.inboxItem.update({
      where: { id: input.inboxItemId },
      data: { autoReplied: true, status: "REPLIED" },
    });

    await prisma.auditLog.create({
      data: {
        teamId: input.teamId,
        action: "inbox.auto_reply",
        message: `Auto-replied via rule ${matched.name}`,
        metadata: {
          ruleId: matched.id,
          commentId,
          replyType: matched.replyType,
        },
      },
    });
  } catch (error) {
    console.error("[auto-reply] failed", error);
  }
}

export async function listInbox(teamId: string, type?: "COMMENT" | "MESSAGE") {
  return prisma.inboxItem.findMany({
    where: {
      teamId,
      ...(type ? { type } : {}),
    },
    include: { connectedAccount: true },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
}

export async function replyToInboxItem(input: {
  teamId: string;
  inboxItemId: string;
  text: string;
}) {
  const item = await prisma.inboxItem.findFirst({
    where: { id: input.inboxItemId, teamId: input.teamId },
  });
  if (!item) throw new Error("Inbox item not found");

  const zernio = await getZernio();

  if (item.type === "COMMENT") {
    await withZernioRetry(
      async () =>
        zernio.comments.replyToInboxPost({
          // @ts-ignore SDK version variance
          path: { commentId: item.externalId },
          body: { text: input.text },
          commentId: item.externalId,
          text: input.text,
        }),
      { label: "comments.replyToInboxPost" },
    );
  } else {
    if (!item.conversationId) throw new Error("Missing conversation id");
    await withZernioRetry(
      async () =>
        zernio.messages.sendInboxMessage({
          // @ts-ignore SDK version variance
          path: { conversationId: item.conversationId },
          body: { text: input.text },
          conversationId: item.conversationId,
          text: input.text,
        }),
      { label: "messages.sendInboxMessage" },
    );
  }

  return prisma.inboxItem.update({
    where: { id: item.id },
    data: { status: "REPLIED" },
  });
}
