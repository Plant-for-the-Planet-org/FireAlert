
import { inferProcedureInput, MiddlewareFunction } from "@trpc/server";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { GetServerSidePropsContext } from "next";
import {
  getServerSession,
  NextAuthOptions,
  DefaultSession,
} from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";

// JWKS client setup
const client = jwksClient({
  jwksUri: `${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid!, (err, key) => {
    const signingKey = key && key.getPublicKey();
    callback(null, signingKey);
  });
}

async function validateToken(token: string): Promise<JwtPayload | null> {
  return new Promise((resolve, _reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        resolve(null);
      } else {
        resolve(decoded as JwtPayload);
      }
    });
  });
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roles: string;
    } & DefaultSession["user"];
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
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },
  providers: [
    Auth0Provider({
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      issuer: env.AUTH0_DOMAIN,
    }),
  ],
};

export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};

export const validateJwtAndSession: MiddlewareFunction = async (
  opts: inferProcedureInput<typeof validateJwtAndSession>
) => {
  const { ctx, next } = opts;
  const { req, res } = ctx;
  const session = await getServerAuthSession({ req, res });

  if (session) {
    return next({ ctx });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  const decoded = await validateToken(token);

  if (!decoded) {
    throw new Error("Unauthorized");
  }

  return next({ ctx });
};