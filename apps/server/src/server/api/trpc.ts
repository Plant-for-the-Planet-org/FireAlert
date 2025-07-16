//  This section defines the "contexts" that are available in the backend API.
//  These allow you to access things when processing a request, like the database, the session, etc.

import type { User } from '@prisma/client';
import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { NextApiRequest } from 'next';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { prisma } from '../../server/db';
import { decodeToken } from '../../utils/routers/trpc';

type CreateContextOptions = {
  req: NextApiRequest;
  user: User | null;
  isAdmin: boolean;
  isImpersonatedUser: boolean;
};

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    req: opts.req,
    prisma,
    user: opts.user,
    isAdmin: opts.isAdmin,
    isImpersonatedUser: opts.isImpersonatedUser,
  };
};

export const createTRPCContext = (
  opts: CreateNextContextOptions,
  user: User | null,
  isAdmin: boolean,
  isImpersonatedUser: boolean,
) => {
  const {req} = opts;

  return createInnerTRPCContext({
    req,
    user,
    isAdmin,
    isImpersonatedUser,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({shape, error}) {
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

const passCtxToNext = t.middleware(async ({ctx, next}) => {
  return next({
    ctx,
  });
});

// There are four kinds of returns in ensureUserIsAuthed middleware.
// TRPC procedures are built with these returns in consideration:
// 1) user: null, isAdmin: false, isImpersonatedUser: false -> this hits to profile route, were we create a new user
// 2) user: adminUserData, isAdmin: true, isImpersonatedUser: false -> this means admin is trying to access their own data, not to impersonate any other user
// 3) user: impersonatedUserData, isAdmin: true, isImpersonatedUser: true -> admin is trying to access impersonated User's data
// 4) user: user, isAdmin: false, isImpersonatedUser: false -> All other normal api calls

const ensureUserIsAuthed = t.middleware(async ({ctx, next}) => {
  // Add Sentry Handlera to middleware
  // Sentry.Handlers.trpcMiddleware({
  //   attachRpcInput: true,
  // });
  // TODO(rupam): Re-enable Sentry TRPC middleware
  // Decode the token
  const {decodedToken, access_token} = await decodeToken(ctx);
  // Find the user associated with the token
  const user = await ctx.prisma.user.findFirst({
    where: {
      sub: decodedToken?.sub,
    },
  });
  // Find the procedure that is being called
  const url = ctx.req.url;
  const procedure = url?.substring(url?.lastIndexOf('.') + 1)
    ? url?.substring(url?.lastIndexOf('.') + 1)
    : '';

  // If that user is not in database
  if (!user) {
    // If profile procedure is called, then move to next with ctx.user as null, and isAdmin as false
    if (procedure == 'profile') {
      return next({
        ctx: {
          token: {
            ...decodedToken,
            access_token,
          },
          user: null as User | null,
          isAdmin: false,
          isImpersonatedUser: false,
        },
      });
    }
    // If any other procedure is called, throw a user not authenticated error, since user is not present.
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User is not authenticated. Please sign up first.',
    });
  }
  // Since user is present, check if the user is Admin, if yes:
  if (user.roles === 'ROLE_ADMIN') {
    const adminUserData = user;
    // Find the impersonatedUserId from headers
    const impersonateUserId = ctx.req.headers['x-impersonate-user-id'];
    // If no impersonatedUserId, Admin must be accessing their own data,
    // Move to next with the token, adminUserData, and isAdmin as true, but impersonatedUser as null.
    if (!impersonateUserId) {
      return next({
        ctx: {
          token: {
            ...decodedToken,
            access_token,
          },
          user: adminUserData as User | null,
          isAdmin: true,
          isImpersonatedUser: false,
        },
      });
    }
    // If impersonatedUserId exists
    // Ensure that the type of impersonatedUserId is a string
    if (typeof impersonateUserId !== 'string') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `The value of req.headers['x-impersonate-user-id'] must be a string`,
      });
    }
    // Find the impersonatedUser from the impersonatedUserId
    const impersonateUser = await ctx.prisma.user.findUnique({
      where: {
        id: impersonateUserId,
      },
    });
    // Throw an error if the impersonatedUser does not exist
    if (!impersonateUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Cannot find the impersonated user with the given id.`,
      });
    }
    // Move to next with user, impersonatedUser, and isAdmin as true
    return next({
      ctx: {
        token: {
          ...decodedToken,
          access_token,
        },
        user: impersonateUser as User | null,
        isAdmin: true,
        isImpersonatedUser: true,
      },
    });
  }
  // User at this point in logic must be "ROLE_CLIENT"
  // Check if the user is soft deleted, for all procedures except profile, if yes, throw an unauthorized error.
  if (procedure !== 'profile') {
    if (user?.deletedAt) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User account has been deleted. Please log in again.',
      });
    }
  }
  // Move to next with user as user, and isAdmin as false, and impersonatedUser as null.
  return next({
    ctx: {
      token: {
        ...decodedToken,
        access_token,
      },
      user: user as User | null,
      isAdmin: false,
      isImpersonatedUser: false,
    },
  });
});

export const publicProcedure = t.procedure.use(passCtxToNext);
export const protectedProcedure = t.procedure.use(ensureUserIsAuthed);

export type InnerTRPCContext = ReturnType<typeof createInnerTRPCContext>;
export type MiddlewareEnsureUserIsAuthed = typeof ensureUserIsAuthed;
