import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getZernioWebhookSecret } from "@/lib/integration-settings";
import { getZernio, withZernioRetry } from "@/lib/zernio";

export function extractWebhookSignature(req: Request): string | null {
  return (
    req.headers.get("x-zernio-signature") ||
    req.headers.get("x-late-signature") ||
    null
  );
}

function normalizeSignature(value: string): string {
  return value.trim().toLowerCase().replace(/^sha256=/, "");
}

export async function verifyZernioSignature(rawBody: string, signatureHeader: string | null) {
  const secret = await getZernioWebhookSecret();

  if (!signatureHeader) {
    // Zernio only sends a signature when the webhook has a secret configured on their side.
    if (secret) {
      console.warn(
        "[webhook] No signature header — Zernio webhook has no secret or secrets are out of sync. Processing anyway.",
      );
    }
    return true;
  }

  if (!secret) {
    console.warn("[webhook] Signature received but ZERNIO_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex").toLowerCase();
  const providedRaw = signatureHeader.trim();
  const provided = normalizeSignature(providedRaw);

  if (providedRaw.toLowerCase() === expected || provided === expected) {
    return true;
  }

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  } catch {
    // fall through
  }

  console.warn("[webhook] Signature mismatch — confirm Admin → Integrations webhook secret matches Zernio");
  return false;
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

function unwrap<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

function normalizeEventType(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/-/g, ".");
  if (normalized === "comment_received" || normalized === "comments.received" || normalized === "inbox.comment") {
    return "comment.received";
  }
  if (normalized === "message_received" || normalized === "messages.received" || normalized === "inbox.message") {
    return "message.received";
  }
  return raw;
}

async function resolveWebhookContext(payload: WebhookPayload, accountId: string) {
  if (accountId) {
    const connected = await prisma.connectedAccount.findUnique({ where: { zernioAccountId: accountId } });
    if (connected) {
      return { teamId: connected.teamId, connectedAccountId: connected.id };
    }
  }

  const profileId = String(payload.profileId || payload.data?.profileId || "");
  if (profileId) {
    const team = await prisma.team.findUnique({ where: { zernioProfileId: profileId } });
    if (team) {
      const connected = accountId
        ? await prisma.connectedAccount.findFirst({
            where: { teamId: team.id, zernioAccountId: accountId },
          })
        : await prisma.connectedAccount.findFirst({
            where: { teamId: team.id, isActive: true },
            orderBy: { connectedAt: "desc" },
          });
      return { teamId: team.id, connectedAccountId: connected?.id ?? null };
    }
  }

  return { teamId: null as string | null, connectedAccountId: null as string | null };
}

function platformVariants(platform: string): string[] {
  const p = platform.toLowerCase();
  if (p === "facebook") return ["facebook", "meta", "metaads"];
  if (p === "instagram") return ["instagram", "meta", "metaads"];
  return [p];
}

async function resolveCommentTeam(
  comment: Record<string, unknown>,
  teamId: string | null,
  connectedAccountId: string | null,
) {
  if (teamId) return { teamId, connectedAccountId };

  const postId = String(comment.postId || "");
  if (postId) {
    const post = await prisma.post.findFirst({ where: { zernioPostId: postId } });
    if (post) {
      const platform = String(comment.platform || "facebook");
      const connected = await prisma.connectedAccount.findFirst({
        where: { teamId: post.teamId, platform: { in: platformVariants(platform) }, isActive: true },
      });
      return { teamId: post.teamId, connectedAccountId: connected?.id ?? null };
    }
  }

  const accountId = String(comment.accountId || "");
  if (accountId) {
    const connected = await prisma.connectedAccount.findUnique({ where: { zernioAccountId: accountId } });
    if (connected) {
      return { teamId: connected.teamId, connectedAccountId: connected.id };
    }
  }

  const platform = String(comment.platform || "");
  if (platform) {
    const accounts = await prisma.connectedAccount.findMany({
      where: { platform: { in: platformVariants(platform) }, isActive: true },
      orderBy: { connectedAt: "desc" },
      take: 10,
    });
    if (accounts.length === 1) {
      return { teamId: accounts[0].teamId, connectedAccountId: accounts[0].id };
    }
  }

  return { teamId: null, connectedAccountId: null };
}

async function resolveMessageTeam(
  message: Record<string, unknown>,
  teamId: string | null,
  connectedAccountId: string | null,
) {
  if (teamId) return { teamId, connectedAccountId };

  const accountId = String(message.accountId || "");
  if (accountId) {
    const connected = await prisma.connectedAccount.findUnique({ where: { zernioAccountId: accountId } });
    if (connected) {
      return { teamId: connected.teamId, connectedAccountId: connected.id };
    }
  }

  const platform = String(message.platform || "");
  if (platform) {
    const accounts = await prisma.connectedAccount.findMany({
      where: { platform: { in: platformVariants(platform) }, isActive: true },
      orderBy: { connectedAt: "desc" },
      take: 10,
    });
    if (accounts.length === 1) {
      return { teamId: accounts[0].teamId, connectedAccountId: accounts[0].id };
    }
  }

  return { teamId: null, connectedAccountId: null };
}

async function zernioAccountIdForItem(
  item: {
    connectedAccountId: string | null;
    metadata: unknown;
    connectedAccount?: { zernioAccountId: string } | null;
  },
) {
  const metadata = (item.metadata || {}) as Record<string, unknown>;
  const fromMeta = String(metadata.accountId || "");
  if (fromMeta) return fromMeta;

  if (item.connectedAccount?.zernioAccountId) return item.connectedAccount.zernioAccountId;

  if (item.connectedAccountId) {
    const connected = await prisma.connectedAccount.findUnique({
      where: { id: item.connectedAccountId },
      select: { zernioAccountId: true },
    });
    if (connected) return connected.zernioAccountId;
  }

  return null;
}

export async function processWebhookEvent(payload: WebhookPayload) {
  const eventType = normalizeEventType(String(payload.type || payload.event || payload.eventType || "unknown"));
  const eventId = String(payload.id || payload.eventId || `${eventType}-${Date.now()}`);

  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existing?.processed) {
    return { skipped: true, reason: "duplicate" };
  }

  const accountId = String(
    payload.accountId ||
      payload.data?.accountId ||
      (payload.data?.comment as Record<string, unknown> | undefined)?.accountId ||
      payload.comment?.accountId ||
      (payload.comment as Record<string, unknown> | undefined)?.accountId ||
      payload.message?.accountId ||
      "",
  );

  const { teamId, connectedAccountId } = await resolveWebhookContext(payload, accountId);

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
      await handleCommentReceived(payload, connectedAccountId, teamId);
    } else if (eventType === "message.received") {
      await handleMessageReceived(payload, connectedAccountId, teamId);
    } else if (eventType.startsWith("post.")) {
      await handlePostLifecycle(payload, teamId);
    } else if (eventType === "ad.status_changed") {
      const { handleAdStatusChanged } = await import("@/services/ads");
      await handleAdStatusChanged(payload as Record<string, unknown>);
    } else if (eventType.startsWith("account.")) {
      console.info("[webhook] Account event received:", eventType);
    } else if (eventType === "webhook.test") {
      console.info("[webhook] Test event received");
    } else {
      console.warn("[webhook] Unhandled event type:", eventType);
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
  const data = (payload.data || {}) as Record<string, unknown>;
  const nestedComment = (data.comment || {}) as Record<string, unknown>;
  const comment = (payload.comment || nestedComment || data) as Record<string, unknown>;

  const resolved = await resolveCommentTeam(comment, teamId, connectedAccountId);
  teamId = resolved.teamId;
  connectedAccountId = resolved.connectedAccountId;

  if (!teamId) {
    console.warn("[webhook] comment.received — could not resolve workspace", {
      postId: comment.postId,
      platform: comment.platform,
    });
    return;
  }

  const author = (comment.author || {}) as Record<string, unknown>;
  const externalId = String(comment.id || comment.commentId || payload.id || "");
  const content = String(comment.text || comment.content || comment.message || "");
  const platform = String(payload.platform || comment.platform || data.platform || "unknown");

  if (!externalId) return;

  let accountIdMeta = String(comment.accountId || "");
  if (!accountIdMeta && connectedAccountId) {
    const connected = await prisma.connectedAccount.findUnique({
      where: { id: connectedAccountId },
      select: { zernioAccountId: true },
    });
    accountIdMeta = connected?.zernioAccountId || "";
  }

  const item = await prisma.inboxItem.upsert({
    where: { teamId_externalId: { teamId, externalId } },
    create: {
      teamId,
      connectedAccountId,
      type: "COMMENT",
      platform,
      externalId,
      conversationId: String(comment.postId || comment.platformPostId || "") || null,
      authorName: String(comment.authorName || author.name || "") || null,
      authorHandle: String(comment.username || author.username || author.id || comment.authorHandle || "") || null,
      content,
      metadata: { ...comment, accountId: accountIdMeta || undefined } as object,
      receivedAt: new Date(),
    },
    update: {
      content,
      metadata: { ...comment, accountId: accountIdMeta || undefined } as object,
      status: "UNREAD",
      ...(connectedAccountId ? { connectedAccountId } : {}),
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
  const data = (payload.data || {}) as Record<string, unknown>;
  const nestedMessage = (data.message || {}) as Record<string, unknown>;
  const message = (payload.message || nestedMessage || data) as Record<string, unknown>;

  const resolved = await resolveMessageTeam(message, teamId, connectedAccountId);
  teamId = resolved.teamId;
  connectedAccountId = resolved.connectedAccountId;

  if (!teamId) {
    console.warn("[webhook] message.received — could not resolve workspace", {
      accountId: message.accountId,
      platform: message.platform,
    });
    return;
  }

  const sender = (message.from || message.sender || {}) as Record<string, unknown>;
  const externalId = String(message.id || message.messageId || payload.id || "");
  const content = String(message.text || message.content || message.body || message.message || "");
  const platform = String(payload.platform || message.platform || data.platform || "unknown");
  const conversationId = String(message.conversationId || message.threadId || "") || null;

  if (!externalId || !content) return;

  let accountIdMeta = String(message.accountId || "");
  if (!accountIdMeta && connectedAccountId) {
    const connected = await prisma.connectedAccount.findUnique({
      where: { id: connectedAccountId },
      select: { zernioAccountId: true },
    });
    accountIdMeta = connected?.zernioAccountId || "";
  }

  await prisma.inboxItem.upsert({
    where: { teamId_externalId: { teamId, externalId } },
    create: {
      teamId,
      connectedAccountId,
      type: "MESSAGE",
      platform,
      externalId,
      conversationId,
      authorName: String(message.authorName || message.fromName || sender.name || "") || null,
      authorHandle: String(message.from || message.username || sender.username || sender.id || "") || null,
      content,
      metadata: { ...message, accountId: accountIdMeta || undefined, conversationId } as object,
      receivedAt: new Date(),
    },
    update: {
      content,
      metadata: { ...message, accountId: accountIdMeta || undefined, conversationId } as object,
      status: "UNREAD",
      ...(connectedAccountId ? { connectedAccountId } : {}),
      ...(conversationId ? { conversationId } : {}),
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
  const postId = String(input.comment.postId || "");
  const accountId = await zernioAccountIdForItem({
    connectedAccountId: input.connectedAccountId,
    metadata: { ...input.comment, accountId: input.comment.accountId },
  });

  if (!postId || !accountId) {
    console.error("[auto-reply] missing postId or accountId");
    return;
  }

  try {
    if (matched.replyType === "dm") {
      await withZernioRetry(
        async () =>
          zernio.comments.sendPrivateReplyToComment({
            path: { commentId, postId },
            body: { accountId, message: matched.replyTemplate },
          }),
        { label: "comments.sendPrivateReplyToComment" },
      );
    } else {
      await withZernioRetry(
        async () =>
          zernio.comments.replyToInboxPost({
            path: { postId },
            body: { accountId, message: matched.replyTemplate, commentId },
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

export async function syncInboxFromZernio(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { zernioProfileId: true },
  });
  if (!team?.zernioProfileId) {
    return { synced: 0, syncedMessages: 0, postsChecked: 0, conversationsChecked: 0, error: "No Zernio profile linked to this workspace" };
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { teamId, isActive: true },
  });
  const accountByZernioId = new Map(accounts.map((a) => [a.zernioAccountId, a]));

  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.comments.listInboxComments({
        query: {
          profileId: team.zernioProfileId!,
          limit: 25,
          sortBy: "date",
          sortOrder: "desc",
        },
      }),
    { label: "comments.listInboxComments" },
  );

  const listData = unwrap<{
    data?: Array<{
      id?: string;
      platform?: string;
      accountId?: string;
      commentCount?: number;
    }>;
  }>(result);

  const posts = listData?.data || [];
  let synced = 0;

  for (const post of posts) {
    if (!post.id || !post.accountId) continue;
    if ((post.commentCount ?? 0) <= 0) continue;

    const commentsResult = await withZernioRetry(
      async () =>
        zernio.comments.getInboxPostComments({
          path: { postId: post.id! },
          query: { accountId: post.accountId!, limit: 50 },
        }),
      { label: "comments.getInboxPostComments" },
    );

    const commentsData = unwrap<{
      comments?: Array<{
        id?: string;
        message?: string;
        createdTime?: string;
        platform?: string;
        from?: { name?: string; username?: string; isOwner?: boolean };
      }>;
    }>(commentsResult);

    const connected = accountByZernioId.get(post.accountId);

    for (const comment of commentsData?.comments || []) {
      if (!comment.id || !comment.message) continue;
      if (comment.from?.isOwner) continue;

      await prisma.inboxItem.upsert({
        where: { teamId_externalId: { teamId, externalId: comment.id } },
        create: {
          teamId,
          connectedAccountId: connected?.id ?? null,
          type: "COMMENT",
          platform: String(comment.platform || post.platform || "facebook"),
          externalId: comment.id,
          conversationId: post.id,
          authorName: comment.from?.name || null,
          authorHandle: comment.from?.username || null,
          content: comment.message,
          metadata: { postId: post.id, accountId: post.accountId, comment } as object,
          receivedAt: comment.createdTime ? new Date(comment.createdTime) : new Date(),
        },
        update: {
          content: comment.message,
          status: "UNREAD",
          ...(connected ? { connectedAccountId: connected.id } : {}),
        },
      });
      synced += 1;
    }
  }

  let syncedMessages = 0;
  const convResult = await withZernioRetry(
    async () =>
      zernio.messages.listInboxConversations({
        query: {
          profileId: team.zernioProfileId!,
          limit: 25,
          sortOrder: "desc",
        },
      }),
    { label: "messages.listInboxConversations" },
  );

  const convData = unwrap<{
    data?: Array<{
      id?: string;
      platform?: string;
      accountId?: string;
      participantName?: string;
      lastMessage?: string;
      updatedTime?: string;
    }>;
  }>(convResult);

  const conversations = convData?.data || [];

  for (const conv of conversations) {
    if (!conv.id || !conv.accountId) continue;

    const msgsResult = await withZernioRetry(
      async () =>
        zernio.messages.getInboxConversationMessages({
          path: { conversationId: conv.id! },
          query: { accountId: conv.accountId!, limit: 50, sortOrder: "desc" },
        }),
      { label: "messages.getInboxConversationMessages" },
    );

    const msgsData = unwrap<{
      messages?: Array<{
        id?: string;
        message?: string;
        platform?: string;
        direction?: string;
        senderName?: string | null;
        senderId?: string;
        createdAt?: string;
      }>;
    }>(msgsResult);

    const connected = accountByZernioId.get(conv.accountId);

    for (const msg of msgsData?.messages || []) {
      if (!msg.id || !msg.message) continue;
      if (msg.direction === "outgoing") continue;

      await prisma.inboxItem.upsert({
        where: { teamId_externalId: { teamId, externalId: msg.id } },
        create: {
          teamId,
          connectedAccountId: connected?.id ?? null,
          type: "MESSAGE",
          platform: String(msg.platform || conv.platform || "facebook"),
          externalId: msg.id,
          conversationId: conv.id,
          authorName: msg.senderName || conv.participantName || null,
          authorHandle: msg.senderId || null,
          content: msg.message,
          metadata: { accountId: conv.accountId, conversationId: conv.id, message: msg } as object,
          receivedAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        },
        update: {
          content: msg.message,
          status: "UNREAD",
          conversationId: conv.id,
          ...(connected ? { connectedAccountId: connected.id } : {}),
        },
      });
      syncedMessages += 1;
    }
  }

  return { synced, syncedMessages, postsChecked: posts.length, conversationsChecked: conversations.length };
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
    include: { connectedAccount: true },
  });
  if (!item) throw new Error("Inbox item not found");

  const zernio = await getZernio();
  const accountId = await zernioAccountIdForItem(item);
  if (!accountId) throw new Error("Could not resolve connected account for this inbox item");

  if (item.type === "COMMENT") {
    const postId = item.conversationId;
    if (!postId) throw new Error("Missing post id for comment reply");

    await withZernioRetry(
      async () =>
        zernio.comments.replyToInboxPost({
          path: { postId },
          body: {
            accountId,
            message: input.text,
            commentId: item.externalId,
          },
        }),
      { label: "comments.replyToInboxPost" },
    );
  } else {
    if (!item.conversationId) throw new Error("Missing conversation id");
    await withZernioRetry(
      async () =>
        zernio.messages.sendInboxMessage({
          path: { conversationId: item.conversationId! },
          body: {
            accountId,
            message: input.text,
          },
        }),
      { label: "messages.sendInboxMessage" },
    );
  }

  return prisma.inboxItem.update({
    where: { id: item.id },
    data: { status: "REPLIED" },
  });
}
