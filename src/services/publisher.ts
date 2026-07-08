import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import type { Prisma, PublishStatus } from "@prisma/client";
import { notifyAdminPostActivity } from "@/services/admin-notify";

export type CreatePostInput = {
  teamId: string;
  userId: string;
  content: string;
  mediaUrls?: string[];
  connectedAccountIds: string[];
  publishNow?: boolean;
  scheduledFor?: string | null;
  timezone?: string;
  platformOptions?: Record<string, unknown>;
  platformSpecificText?: Record<string, string>;
  draft?: boolean;
};

async function writeAudit(input: {
  teamId: string;
  userId?: string;
  postId?: string;
  action: string;
  status?: PublishStatus;
  message?: string;
  metadata?: object;
}) {
  await prisma.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      postId: input.postId,
      action: input.action,
      status: input.status,
      message: input.message,
      metadata: input.metadata,
    },
  });
}

export async function createAndPublishPost(input: CreatePostInput) {
  const accounts = await prisma.connectedAccount.findMany({
    where: {
      teamId: input.teamId,
      id: { in: input.connectedAccountIds },
      isActive: true,
    },
  });

  if (!input.draft && accounts.length === 0) {
    throw new Error("Select at least one connected account");
  }

  if (!input.content?.trim() && (!input.mediaUrls || input.mediaUrls.length === 0)) {
    throw new Error("Content or media is required");
  }

  let status: PublishStatus = "DRAFT";
  if (!input.draft) {
    if (input.publishNow) status = "PENDING";
    else if (input.scheduledFor) status = "SCHEDULED";
    else status = "DRAFT";
  }

  const post = await prisma.post.create({
    data: {
      teamId: input.teamId,
      createdById: input.userId,
      content: input.content,
      mediaUrls: input.mediaUrls ?? [],
      status,
      publishNow: Boolean(input.publishNow),
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      timezone: input.timezone || "UTC",
      platformOptions: (input.platformOptions ?? {}) as Prisma.InputJsonValue,
      targets: {
        create: accounts.map((account) => ({
          connectedAccountId: account.id,
          platform: account.platform,
          status: status === "DRAFT" ? "DRAFT" : "PENDING",
          platformSpecificText: input.platformSpecificText?.[account.id] || null,
        })),
      },
    },
    include: { targets: { include: { connectedAccount: true } } },
  });

  await writeAudit({
    teamId: input.teamId,
    userId: input.userId,
    postId: post.id,
    action: "post.created",
    status: post.status,
    message: `Post created with status ${post.status}`,
  });

  if (input.draft || status === "DRAFT") {
    notifyAdminPostActivity({
      teamId: input.teamId,
      userId: input.userId,
      action: "draft",
      content: input.content,
      postId: post.id,
      platforms: accounts.map((a) => a.platform),
    });
    return post;
  }

  return publishPostToZernio(post.id, input.userId);
}

export async function publishPostToZernio(postId: string, userId?: string) {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: {
      targets: { include: { connectedAccount: true } },
      team: true,
    },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { status: "PENDING", errorMessage: null },
  });

  const zernio = await getZernio();
  const platforms = post.targets.map((target) => {
    const account = target.connectedAccount;
    const options = (post.platformOptions as Record<string, unknown>) || {};
    const platformOpts = (options[account.platform] as Record<string, unknown>) || {};

    return {
      platform: account.platform,
      accountId: account.zernioAccountId,
      platformSpecificContent: target.platformSpecificText || undefined,
      ...platformOpts,
    };
  });

  const body: Record<string, unknown> = {
    content: post.content,
    platforms,
  };

  if (post.mediaUrls.length > 0) {
    body.mediaUrls = post.mediaUrls;
    body.mediaItems = post.mediaUrls.map((url) => ({
      type: guessMediaType(url),
      url,
    }));
  }

  if (post.publishNow) {
    body.publishNow = true;
  } else if (post.scheduledFor) {
    body.scheduledFor = post.scheduledFor.toISOString();
    body.timezone = post.timezone || "UTC";
  }

  try {
    const result = await withZernioRetry(
      async () =>
        zernio.posts.createPost({
          // @ts-ignore SDK version variance
          body,
          ...body,
        }),
      { label: "posts.createPost" },
    );

    const remotePost =
      (result as { post?: Record<string, unknown> }).post ||
      (result as { data?: { post?: Record<string, unknown> } }).data?.post ||
      (result as { data?: Record<string, unknown> }).data ||
      {};

    const zernioPostId = String(
      remotePost._id || remotePost.id || (result as { data?: { _id?: string } }).data?._id || "",
    );

    const nextStatus: PublishStatus = post.publishNow ? "PUBLISHED" : "SCHEDULED";

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: nextStatus,
        zernioPostId: zernioPostId || null,
        publishedAt: post.publishNow ? new Date() : null,
        errorMessage: null,
        targets: {
          updateMany: {
            where: { postId },
            data: { status: nextStatus },
          },
        },
      },
      include: { targets: true },
    });

    await writeAudit({
      teamId: post.teamId,
      userId,
      postId,
      action: post.publishNow ? "post.published" : "post.scheduled",
      status: nextStatus,
      message: `Synced to Zernio post ${zernioPostId || "unknown"}`,
      metadata: { zernioPostId, remote: remotePost },
    });

    notifyAdminPostActivity({
      teamId: post.teamId,
      userId,
      action: post.publishNow ? "published" : "scheduled",
      content: post.content,
      postId,
      platforms: post.targets.map((t) => t.platform),
      scheduledFor: post.scheduledFor,
    });

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";

    const failed = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "FAILED",
        errorMessage: message,
        targets: {
          updateMany: {
            where: { postId },
            data: { status: "FAILED", errorMessage: message },
          },
        },
      },
      include: { targets: true },
    });

    await writeAudit({
      teamId: post.teamId,
      userId,
      postId,
      action: "post.failed",
      status: "FAILED",
      message,
    });

    notifyAdminPostActivity({
      teamId: post.teamId,
      userId,
      action: "failed",
      content: post.content,
      postId,
      platforms: post.targets.map((t) => t.platform),
    });

    return failed;
  }
}

export async function getMediaPresignedUrl(input: {
  filename: string;
  contentType: string;
}) {
  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.media.getMediaPresignedUrl({
        // @ts-ignore SDK version variance
        body: {
          filename: input.filename,
          contentType: input.contentType,
        },
        filename: input.filename,
        contentType: input.contentType,
      }),
    { label: "media.getMediaPresignedUrl" },
  );

  const data =
    (result as { data?: Record<string, string> }).data ||
    (result as Record<string, string>);

  return {
    uploadUrl: data.uploadUrl,
    publicUrl: data.publicUrl,
  };
}

function guessMediaType(url: string): "image" | "video" {
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(lower)) return "video";
  return "image";
}
