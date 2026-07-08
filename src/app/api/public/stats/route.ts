import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { displaySocialProofStats } from "@/lib/social-proof-stats";

export async function GET() {
  try {
    const [users, posts, teams, aiGenerations] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { status: { in: ["PUBLISHED", "SCHEDULED"] } } }),
      prisma.team.count(),
      prisma.aiUsageLog.count(),
    ]);

    const displayed = displaySocialProofStats({
      teams,
      posts,
      aiGenerations,
    });

    return NextResponse.json({
      users: Math.max(users, 1),
      posts: displayed.posts,
      postsPublished: displayed.posts,
      teams: displayed.teams,
      aiGenerations: displayed.aiGenerations,
    });
  } catch {
    const displayed = displaySocialProofStats({ teams: 0, posts: 0, aiGenerations: 0 });
    return NextResponse.json({
      users: 500,
      posts: displayed.posts,
      postsPublished: displayed.posts,
      teams: displayed.teams,
      aiGenerations: displayed.aiGenerations,
    });
  }
}
