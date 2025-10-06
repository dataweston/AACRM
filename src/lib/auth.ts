import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";

const appleClientId =
  process.env.APPLE_CLIENT_ID ??
  process.env.AUTH_APPLE_CLIENT_ID ??
  process.env.AUTH_APPLE_ID ??
  "apple-client-id";

const appleSecretFromParts =
  process.env.APPLE_TEAM_ID && process.env.APPLE_PRIVATE_KEY && process.env.APPLE_KEY_ID
    ? {
        teamId: process.env.APPLE_TEAM_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        keyId: process.env.APPLE_KEY_ID,
      }
    : null;

const appleClientSecret = process.env.APPLE_CLIENT_SECRET ?? appleSecretFromParts ?? "apple-client-secret";

export const authOptions: NextAuthOptions = {
  providers: [
    AppleProvider({
      clientId: appleClientId,
      clientSecret: appleClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
