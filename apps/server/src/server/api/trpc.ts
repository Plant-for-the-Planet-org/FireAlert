//  This section defines the "contexts" that are available in the backend API.
//  These allow you to access things when processing a request, like the database, the session, etc.

import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";

import { getServerAuthSession } from "../../server/auth";
import { prisma } from "../../server/db";

export interface JwtPayload {
  [key: string]: any;
  iss?: string | undefined;
  sub?: string | undefined;
  aud?: string | string[] | undefined;
  exp?: number | undefined;
  nbf?: number | undefined;
  iat?: number | undefined;
  jti?: string | undefined;
}

export interface PPJwtPayload extends JwtPayload {
  "https://app.plant-for-the-planet.org/email": string;
  "https://app.plant-for-the-planet.org/email_verified": boolean;
  azp: string;
}

type CreateContextOptions = {
  session: Session | null;
  req: NextApiRequest;
};

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    req: opts.req,
    prisma,
  };
};

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    req,
    session,
  });
};

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { checkTokenIsValid, getUserIdByToken } from '../../utils/authorization/token'
import { NextApiRequest } from "next";


const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

const passCtxToNext = t.middleware(async ({ ctx, next }) => {
  return next({
    ctx
  })
})

export const publicProcedure = t.procedure.use(passCtxToNext);

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  let passTokenToNext = false;
  let decodedToken: PPJwtPayload | undefined = undefined;
  let access_token: string | undefined = undefined;
  if (ctx.req.headers.authorization) {
    access_token = ctx.req.headers.authorization.replace("Bearer ", "");
    if (!access_token) {
      passTokenToNext = false;
    } else {
      try {
        const decoded = await checkTokenIsValid(access_token);
        if (typeof decoded === "string") {
          decodedToken = JSON.parse(decoded);
        } else {
          decodedToken = decoded as PPJwtPayload;
        }
        passTokenToNext = true;
      } catch (error) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: `${error}` });
      }
    }
  }
  if (passTokenToNext && decodedToken) {
    return next({
      ctx: {
        token: {
          ...decodedToken,
          access_token,
        },
      },
    });
  } else {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: `Invalid Session` });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  }
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user.roles !== 'ROLE_ADMIN') {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user }
    }
  })
})

export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

export type InnerTRPCContext = ReturnType<typeof createInnerTRPCContext>;
export type MiddlewareEnsureUserIsAuthed = typeof enforceUserIsAuthed;
