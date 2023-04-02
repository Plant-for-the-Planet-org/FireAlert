import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import Auth0Provider from "next-auth/providers/auth0"

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { env } from "../env.mjs";
import { prisma } from "../server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roles: string;
    } & DefaultSession["user"],
  }
  interface User {
    roles: string;
  }
}

export const authOptions: NextAuthOptions = {

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.roles = user.roles;
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Auth0Provider({
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      // NextAuth uses issuer as AUTH0_DOMAIN
      issuer: env.AUTH0_DOMAIN,
    })
  ],
};


// Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
