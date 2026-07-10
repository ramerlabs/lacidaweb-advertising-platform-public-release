/**
 * Bootstrap a fresh lacidaweb database.
 *
 * 1. Create a NEW Neon project at https://console.neon.tech (name: lacidaweb)
 * 2. Copy the connection string into .env.local as DATABASE_URL
 * 3. Run:
 *      node scripts/setup-lacidaweb-db.mjs <admin-email> <admin-password>
 *
 * Or with explicit URL:
 *      DATABASE_URL="postgresql://..." node scripts/setup-lacidaweb-db.mjs <email> <password>
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";

const [email, password, teamNameArg] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/setup-lacidaweb-db.mjs <admin-email> <admin-password> [team-name]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const LACIDAWEB_BRANDING = {
  title: "lacidaweb",
  product: "Advertising Platform",
  description:
    "lacidaweb is a self-serve advertising platform where businesses launch awareness, traffic, and conversion campaigns, fund a wallet, and track performance in real time.",
  logoUrl: "/branding/logo.svg",
  logoDarkUrl: "",
  logoHeightPx: 40,
  faviconUrl: "/branding/icon.svg",
  supportEmail: "support@lacidaweb.com",
};

const prisma = new PrismaClient();

async function main() {
  console.log("Pushing Prisma schema to database...");
  execSync("npx prisma db push", { stdio: "inherit" });

  console.log("Seeding lacidaweb site settings...");
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...LACIDAWEB_BRANDING },
    update: LACIDAWEB_BRANDING,
  });

  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      adsEnabled: true,
      googleOAuthEnabled: true,
      facebookOAuthEnabled: false,
    },
    update: {
      adsEnabled: true,
      googleOAuthEnabled: true,
      facebookOAuthEnabled: false,
    },
  });

  await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  console.log("Seeding lacidaweb FAQs...");
  await prisma.faq.deleteMany({});
  await prisma.faq.createMany({
    data: [
      {
        question: "What is lacidaweb?",
        answer:
          "lacidaweb is a self-serve advertising platform. Create awareness, traffic, and conversion campaigns, fund a prepaid wallet, and track performance — similar to Facebook Ads, built for modern advertisers.",
        sortOrder: 0,
        isPublished: true,
      },
      {
        question: "Do I need a subscription to run ads?",
        answer:
          "No. Create a free account, top up your wallet when you're ready, and pay for campaigns from your balance. You only spend when you run ads.",
        sortOrder: 1,
        isPublished: true,
      },
      {
        question: "Which payment methods are supported?",
        answer:
          "USDT (ERC-20 / TRC-20), GCash, PayPal, and US bank transfer (ACH via Stripe). All top-ups credit your lacidaweb wallet balance.",
        sortOrder: 2,
        isPublished: true,
      },
      {
        question: "When do my ads go live?",
        answer:
          "After you submit a campaign, our team reviews it for compliance. Once approved and your wallet has sufficient balance, your campaign goes active.",
        sortOrder: 3,
        isPublished: true,
      },
      {
        question: "How does the campaign builder work?",
        answer:
          "Pick an objective (Awareness, Traffic, or Conversions), define your audience, set a daily or lifetime budget, then upload your ad creative. Submit for review when you're done.",
        sortOrder: 4,
        isPublished: true,
      },
      {
        question: "How do I get support?",
        answer:
          "Open a support ticket from your dashboard under Support. Our team will respond based on your request priority.",
        sortOrder: 5,
        isPublished: true,
      },
    ],
  });

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);
  const displayName = normalizedEmail.split("@")[0];
  const teamName = teamNameArg?.trim() || "My Business";

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      name: displayName,
      passwordHash,
    },
    update: {
      passwordHash,
      bannedAt: null,
      banReason: null,
    },
  });

  let membership = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: { team: true },
  });

  if (!membership) {
    const team = await prisma.team.create({
      data: {
        name: teamName,
        slug: `lw-${user.id.slice(-8)}`,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
    membership = await prisma.teamMember.findFirstOrThrow({
      where: { teamId: team.id, userId: user.id },
      include: { team: true },
    });
  }

  console.log("");
  console.log("lacidaweb database ready.");
  console.log(`  Admin:  ${normalizedEmail}`);
  console.log(`  Team:   ${membership.team.name} (${membership.team.id})`);
  console.log("");
  console.log("Add to .env.local:");
  console.log(`  ADMIN_EMAILS="${normalizedEmail}"`);
  console.log("");
  console.log("Restart dev server: npm run dev");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
