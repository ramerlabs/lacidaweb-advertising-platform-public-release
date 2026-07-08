import type { PublishStatus } from "@prisma/client";

export type ActivityFeedItem = {
  id: string;
  content: string;
  status: PublishStatus;
  createdAt: string;
  isSimulated?: boolean;
};

const STATUSES: PublishStatus[] = ["PUBLISHED", "SCHEDULED", "DRAFT", "PENDING", "FAILED"];

const SAMPLE_SNIPPETS = [
  "Summer product launch teaser — shop the new collection now 🚀",
  "Behind the scenes at our studio — watch how we create content",
  "Weekly tips: 5 ways to grow your audience organically",
  "Client spotlight: how @brand scaled to 50K followers in 90 days",
  "New blog post is live — link in bio for the full guide",
  "Flash sale ends tonight! Use code SAVE20 at checkout",
  "Team hiring announcement — join our growing marketing crew",
  "Event recap: highlights from last week's webinar",
  "Poll: which topic should we cover next? Vote in comments",
  "Product demo video — see our latest features in action",
  "Customer testimonial: real results from real businesses",
  "Monday motivation — start your week with purpose",
  "Tutorial: step-by-step guide to multi-platform posting",
  "Q&A session reminder — join us live tomorrow at 3 PM",
  "Holiday hours update for all our locations",
  "Partnership announcement — excited to team up with industry leaders",
  "Free resource download — grab our 2026 content calendar template",
  "Case study: 3x engagement boost with unified inbox replies",
  "New feature rollout — schedule posts across all channels in one click",
  "Community shoutout — thank you for 10K followers!",
  "Industry news roundup — what marketers need to know this week",
  "Before & after: rebranding journey in 60 seconds",
  "Live stream starting soon — tap to get notified",
  "Member exclusive: early access to our spring collection",
  "Throwback Thursday — our favorite campaign from last year",
];

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function generateSimulatedActivity(count: number, seedKey: string): ActivityFeedItem[] {
  if (count <= 0) return [];

  const rand = seededRandom(hashSeed(seedKey));
  const now = Date.now();

  return Array.from({ length: count }, (_, index) => {
    const snippet = SAMPLE_SNIPPETS[Math.floor(rand() * SAMPLE_SNIPPETS.length)];
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const hoursAgo = Math.floor(rand() * 72) + index;
    const createdAt = new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();

    return {
      id: `sim-${seedKey}-${index}`,
      content: snippet,
      status,
      createdAt,
      isSimulated: true,
    };
  });
}

export function buildActivityFeed(input: {
  realPosts: Array<{ id: string; content: string; status: string; createdAt: Date | string }>;
  displayCount: number;
  simulatedEnabled: boolean;
  seedKey: string;
}): ActivityFeedItem[] {
  const displayCount = Math.max(20, input.displayCount);

  const real: ActivityFeedItem[] = input.realPosts
    .map((post) => ({
      id: post.id,
      content: post.content,
      status: post.status as PublishStatus,
      createdAt: typeof post.createdAt === "string" ? post.createdAt : post.createdAt.toISOString(),
      isSimulated: false,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!input.simulatedEnabled) {
    return real.slice(0, displayCount);
  }

  const items = [...real];
  if (items.length < displayCount) {
    items.push(...generateSimulatedActivity(displayCount - items.length, input.seedKey));
  }

  return items.slice(0, Math.max(displayCount, real.length));
}
