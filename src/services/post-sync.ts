import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import type { PublishStatus } from "@prisma/client";

function unwrap<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

function mapZernioStatus(remote: string | undefined): PublishStatus | null {
  switch ((remote || "").toLowerCase()) {
    case "published":
    case "partial":
      return "PUBLISHED";
    case "failed":
      return "FAILED";
    case "scheduled":
    case "publishing":
      return "SCHEDULED";
    case "draft":
      return "DRAFT";
    default:
      return null;
  }
}

async function fetchZernioPostStatus(zernioPostId: string): Promise<{
  status: string | undefined;
  publishedAt: string | undefined;
  error: string | undefined;
}> {
  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.posts.getPost({
        // @ts-ignore SDK version variance
        path: { postId: zernioPostId },
        postId: zernioPostId,
      }),
    { label: "posts.getPost", retries: 1 },
  );

  const data = unwrap<{ post?: Record<string, unknown> }>(result);
  const post = data.post || (result as { post?: Record<string, unknown> }).post;
  if (!post) return { status: undefined, publishedAt: undefined, error: undefined };

  return {
    status: String(post.status || ""),
    publishedAt: post.publishedAt ? String(post.publishedAt) : undefined,
    error: post.errorMessage ? String(post.errorMessage) : undefined,
  };
}

/** Pull live status from Zernio for queued posts so SCHEDULED becomes PUBLISHED after publish. */
export async function syncTeamPostStatuses(teamId: string): Promise<{ updated: number }> {
  const now = new Date();
  const candidates = await prisma.post.findMany({
    where: {
      teamId,
      zernioPostId: { not: null },
      status: { in: ["SCHEDULED", "PENDING"] },
    },
    select: {
      id: true,
      zernioPostId: true,
      status: true,
      scheduledFor: true,
    },
    take: 30,
  });

  if (candidates.length === 0) return { updated: 0 };

  let updated = 0;

  for (const post of candidates) {
    if (!post.zernioPostId) continue;

    const due =
      post.scheduledFor && post.scheduledFor.getTime() <= now.getTime() + 60_000;
    if (post.status === "SCHEDULED" && post.scheduledFor && !due) {
      continue;
    }

    try {
      const remote = await fetchZernioPostStatus(post.zernioPostId);
      const nextStatus = mapZernioStatus(remote.status);
      if (!nextStatus || nextStatus === post.status) continue;
      if (nextStatus === "SCHEDULED" || nextStatus === "DRAFT") continue;

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: nextStatus,
          publishedAt:
            nextStatus === "PUBLISHED"
              ? remote.publishedAt
                ? new Date(remote.publishedAt)
                : new Date()
              : undefined,
          errorMessage: nextStatus === "FAILED" ? remote.error || "Publish failed on platform" : null,
          targets: {
            updateMany: {
              where: { postId: post.id },
              data: { status: nextStatus },
            },
          },
        },
      });
      updated += 1;
    } catch (error) {
      console.warn(`[post-sync] failed for ${post.id}`, error);
    }
  }

  return { updated };
}
