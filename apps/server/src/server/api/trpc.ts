//  This section defines the "contexts" that are available in the backend API.
//  These allow you to access things when processing a request, like the database, the session, etc.

import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";
import { getServerAuthSession } from "../../server/auth";
import { prisma } from "../../server/db";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { NextApiRequest } from "next";
import { checkSoftDelete, tokenAuthentication} from '../../utils/routers/trpc'

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

const enforceUserIsAuthedAndNotSoftDeleted = t.middleware(async ({ ctx, next }) => {
  const { isTokenAuthentication, decodedToken, access_token } = await tokenAuthentication(ctx)
  const sub = decodedToken!.sub!
  await checkSoftDelete({ctx, sub, isTokenAuthentication})
  if (isTokenAuthentication && decodedToken) {
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
})

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  const { isTokenAuthentication, decodedToken, access_token } = await tokenAuthentication(ctx)
  if (isTokenAuthentication && decodedToken) {
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

export const publicProcedure = t.procedure.use(passCtxToNext);
export const protectedProcedure = t.procedure.use(enforceUserIsAuthedAndNotSoftDeleted);
export const userProcedure = t.procedure.use(enforceUserIsAuthed)
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

export type InnerTRPCContext = ReturnType<typeof createInnerTRPCContext>;
export type MiddlewareEnsureUserIsAuthed = typeof enforceUserIsAuthed;
