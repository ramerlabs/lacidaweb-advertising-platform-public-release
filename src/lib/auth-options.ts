import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getAiSettings } from "@/lib/ai-settings";
import { isOAuthProviderAllowed } from "@/lib/oauth-settings";

const useSecureCookies = process.env.NODE_ENV === "production";
const cookieDomain = process.env.NEXTAUTH_COOKIE_DOMAIN?.trim() || undefined;

function buildOAuthProviders() {
  const providers: NextAuthOptions["providers"] = [];

  if (process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
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
          accountType: user.accountType,
        };
      },
    }),
    ...buildOAuthProviders(),
  ],
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: cookieDomain,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials") {
        if (!(await isOAuthProviderAllowed(account.provider))) {
          return false;
        }
      }

      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { bannedAt: true },
      });
      if (dbUser?.bannedAt) return false;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.banned = false;
        if ("accountType" in user && user.accountType) {
          token.accountType = user.accountType as "ADVERTISER" | "PUBLISHER";
        }
      }

      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase().trim() },
          select: { id: true, bannedAt: true, accountType: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.banned = Boolean(dbUser.bannedAt);
          token.accountType = dbUser.accountType;
        }
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { bannedAt: true, accountType: true },
          });
          if (dbUser) {
            token.banned = Boolean(dbUser.bannedAt);
            token.accountType = dbUser.accountType;
          }
        } catch {
          // DB hiccup — keep existing session
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
        session.user.accountType = (token.accountType as "ADVERTISER" | "PUBLISHER") || "ADVERTISER";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

export async function createUserWorkspace(input: {
  userId: string;
  teamName: string;
  grantTrialTokens?: boolean;
  accountType?: "ADVERTISER" | "PUBLISHER";
}) {
  const baseSlug = slugify(input.teamName) || "workspace";
  let slug = baseSlug;
  let i = 1;
  while (await prisma.team.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const trialTokens =
    input.grantTrialTokens !== false && input.accountType !== "PUBLISHER"
      ? (await getAiSettings()).aiTrialTokens || 50_000
      : 0;

  const team = await prisma.team.create({
    data: {
      name: input.teamName,
      slug,
      aiTokenBalance: trialTokens,
      aiEnabled: trialTokens > 0,
      members: {
        create: { userId: input.userId, role: "OWNER" },
      },
    },
  });

  return team;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  teamName: string;
  accountType?: "ADVERTISER" | "PUBLISHER";
}) {
  const email = input.email.toLowerCase().trim();
  const accountType = input.accountType === "PUBLISHER" ? "PUBLISHER" : "ADVERTISER";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      accountType,
    },
  });

  const team = await createUserWorkspace({
    userId: user.id,
    teamName: input.teamName,
    grantTrialTokens: accountType === "ADVERTISER",
    accountType,
  });

  return {
    ...user,
    memberships: [{ teamId: team.id, team }],
  };
}

export async function userNeedsOnboarding(userId: string): Promise<boolean> {
  const count = await prisma.teamMember.count({ where: { userId } });
  return count === 0;
}
