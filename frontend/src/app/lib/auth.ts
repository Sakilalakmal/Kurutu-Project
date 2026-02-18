import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "./prisma";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const baseURL = getRequiredEnv("BETTER_AUTH_BASE_URL");
const baseOrigin = new URL(baseURL).origin;
const trustedOrigins = Array.from(
  new Set([
    baseOrigin,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []),
  ])
);

export const auth = betterAuth({
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL,
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      prompt: "select_account",
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});

export const getServerSession = async () => {
  const requestHeaders = await headers();

  return auth.api.getSession({
    headers: new Headers(requestHeaders),
  });
};
