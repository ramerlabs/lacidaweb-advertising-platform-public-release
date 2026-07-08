import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { ensureTeamZernioProfile } from "@/services/profiles";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        if (user.bannedAt) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { bannedAt: true },
          });
          token.banned = Boolean(dbUser?.bannedAt);
          if (!dbUser) token.banned = true;
        } catch {
          // DB hiccup — do not ban on transient errors
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.banned) {
        return {
          ...session,
          user: undefined as unknown as typeof session.user,
          error: "BANNED",
        };
      }
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  teamName: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const baseSlug = slugify(input.teamName) || "workspace";
  let slug = baseSlug;
  let i = 1;
  while (await prisma.team.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          team: {
            create: {
              name: input.teamName,
              slug,
            },
          },
        },
      },
    },
    include: {
      memberships: { include: { team: true } },
    },
  });

  const team = user.memberships[0]?.team;
  if (team) {
    try {
      await ensureTeamZernioProfile(team.id);
    } catch (error) {
      console.error("[register] Zernio profile provisioning failed", error);
    }
  }

  return user;
}
