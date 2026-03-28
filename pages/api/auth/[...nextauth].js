import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const hasGoogleOAuthEnv = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const authOptions = {
  providers: hasGoogleOAuthEnv
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  pages: {
    signIn: "/", // We handle sign-in in our own UI
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "anchor-paper-trade-dev-secret",
};

export default NextAuth(authOptions);
