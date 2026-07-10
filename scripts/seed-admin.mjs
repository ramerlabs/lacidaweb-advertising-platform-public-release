/**
 * Bootstrap the default platform admin for lacidaweb.
 *
 * Defaults: user `admin` / password `admin123`
 * Override: node scripts/seed-admin.mjs <username-or-email> <password>
 *
 * Also prints the ADMIN_EMAILS line to add to .env / Vercel.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_USER = "admin";
const DEFAULT_PASSWORD = "admin123";

const rawUser = (process.argv[2] || DEFAULT_USER).trim().toLowerCase();
const password = process.argv[3] || DEFAULT_PASSWORD;

/** Credentials login accepts `admin` or a full email. */
const email = rawUser.includes("@") ? rawUser : rawUser;

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        bannedAt: null,
        banReason: null,
        name: existing.name || "Admin",
      },
    });
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        name: "Admin",
        passwordHash,
        accountType: "ADVERTISER",
      },
    });

    await prisma.team.create({
      data: {
        name: "Platform Admin",
        slug: `admin-${user.id.slice(-8)}`,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    console.log(`Created admin user: ${email}`);
  }

  console.log("");
  console.log("Login at /login/admin");
  console.log(`  Username: ${email}`);
  console.log(`  Password: ${password}`);
  console.log("");
  console.log("Add to .env / Vercel (required for admin panel access):");
  console.log(`  ADMIN_EMAILS="${email}"`);
  if (password === DEFAULT_PASSWORD) {
    console.log("");
    console.log("WARNING: Change the default password after first login.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
