import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") ?? [],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 10,
    storage: "database",
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  user: {
    additionalFields: {
      role: {
        type: ["admin", "agent"],
        required: true,
        defaultValue: "agent",
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
