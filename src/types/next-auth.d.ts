import { DefaultSession } from "next-auth";
import type { ClientAccountType } from "@/lib/account-type";

declare module "next-auth" {
  interface User {
    accountType?: ClientAccountType;
  }

  interface Session {
    user: {
      id: string;
      accountType: ClientAccountType;
    } & DefaultSession["user"];
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    banned?: boolean;
    accountType?: ClientAccountType;
  }
}
