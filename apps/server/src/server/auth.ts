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
import { signIn, signOut } from "next-auth/react";
import { getToken, JWT } from "next-auth/jwt";
import { Account, User } from "@prisma/client";
import jwt, {type JwtPayload} from 'jsonwebtoken'
import { setCookie, destroyCookie } from 'nookies';


/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roles: string;
      id_token?: string;
      token_type?: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"],
  }


  interface User {
    // ...other properties
    // role: UserRole;
    roles: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {

  session: {
    strategy: 'jwt'
  },
  
  callbacks: {

    session: async({session, token}) => {  
      const user = session.user as User;
      const id_token = token.id_token as string;
      const token_type = token.token_type as string;
      const roles = user.roles as string;
      
      return {
        ...session,
        user: {
          ...session.user,
          id_token: id_token,
          token_type: token_type,
          roles: roles
        }
      }
    },

    jwt: async({token, user, account}) => {
      if(user && account) {
        const u = user as unknown as User
        const a = account as unknown as Account

        const id_token = a.id_token as string;
        const token_type = a.token_type as string;
        const roles = u.roles as string;
        return {
          ...token,
          id_token: id_token,
          token_type: token_type,
          roles: roles
        }
      }
      return token
    },
  },

  adapter: PrismaAdapter(prisma),

  // When a user goes to this page, they are supposed to signup, or signin!
  // pages:{
  //   signIn: "/",
  //   newUser: '/signUp'
  // },

  providers: [
    Auth0Provider({
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      // NextAuth uses issuer as AUTH0_DOMAIN
      issuer: env.AUTH0_DOMAIN,
    })



    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
