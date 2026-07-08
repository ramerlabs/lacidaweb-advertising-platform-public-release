import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/services/email";
import { getAiSettings } from "@/lib/ai-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { formatTokenCount } from "@/lib/ai-pricing";

export async function maybeNotifyLowTokens(teamId: string, tokenBalance: number) {
  const settings = await getAiSettings();
  const threshold = settings.aiLowTokenThreshold ?? 50_000;
  if (tokenBalance > threshold) return;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      lowTokenAlertAt: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });
  if (!team) return;

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (team.lowTokenAlertAt && team.lowTokenAlertAt.getTime() > dayAgo) return;

  const owner = team.members[0]?.user;
  if (!owner?.email) return;

  const site = await getSiteSettings();
  await sendEmail({
    to: owner.email,
    subject: `Low AI token balance — ${site.title}`,
    text: `Hi ${owner.name || "there"},\n\nYour workspace AI token balance is low (${tokenBalance.toLocaleString()} tokens / ${formatTokenCount(tokenBalance)} remaining).\n\nTop up from Billing to keep generating captions and images.\n\n— ${site.title}`,
  });

  await prisma.team.update({
    where: { id: teamId },
    data: { lowTokenAlertAt: new Date() },
  });
}
