/**
 * One-off admin setup: upsert user and set password hash.
 * Usage: node scripts/seed-admin.mjs <email> <password>
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/seed-admin.mjs <email> <password>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    console.log(`Updated password for existing user: ${normalizedEmail}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      passwordHash,
    },
  });

  const team = await prisma.team.create({
    data: {
      name: `${user.name}'s Team`,
      slug: `team-${user.id.slice(-8)}`,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  console.log(`Created admin user ${normalizedEmail} with team ${team.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
