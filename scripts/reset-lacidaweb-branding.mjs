import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LACIDAWEB = {
  title: "lacidaweb",
  product: "Advertising Platform",
  description:
    "lacidaweb is a self-serve advertising platform where businesses launch awareness, traffic, and conversion campaigns, fund a wallet, and track performance in real time.",
  logoUrl: "/branding/logo.svg",
  logoDarkUrl: "/branding/logo-on-dark.svg",
  logoHeightPx: 40,
  faviconUrl: "/branding/icon.svg",
  supportEmail: "support@lacidaweb.com",
};

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...LACIDAWEB },
    update: LACIDAWEB,
  });

  console.log("Site settings updated to lacidaweb branding.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
