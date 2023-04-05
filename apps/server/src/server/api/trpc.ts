/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";

import { getServerAuthSession } from "../../server/auth";
import { prisma } from "../../server/db";
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
// const { JwtHeader, JwtPayload } = require('@types/jsonwebtoken');


// interface Token extends  JwtPayload {
//   "https://app.plant-for-the-planet.org/email": string;
//   "https://app.plant-for-the-planet.org/email_verified": boolean;
//   azp: string;
// }

// interface Jwt {
//   header: JwtHeader;
//   payload: Token | string; // Updated to use the Token interface as payload type
//   signature: string;
// }


type CreateContextOptions = {
  session: Session | null;
  req: NextApiRequest;
};



/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    req: opts.req,
    prisma,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint. 
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;



  // when getUser api call is made:
  // verify if token is valid, and signed using getToken()
  // decode the token! 
  // check if sub from the token already exists as a providerAccountId from account table, 
  // use sub as user guid
  // if user exists (go to line 81)
  // if user does not exist, create the new user with the information from the access token. 
  // then add then return the user in the api call



  // when any other api call is made:
  // verify if token is valid, and signed using getToken()
  // decode the token! 
  // check if sub from the token already exists as a providerAccountId from account table, 
  // if user is invalid, and route is profile, 
  // use sub as user guid
  // if user exists (go to line 91) // compare user from the sub to the database
  // if user does not exist,
  // and route is not profile, throw a 401 error. 
  // else add user to the database
  // then return the data that belongs to the user

  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    req,
    session
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import {checkTokenIsValid} from '../../utils/token'
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

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */


export const publicProcedure = t.procedure;

/** Reusable middleware that enforces users are logged in before running the procedure. */

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  let passTokenToNext = false;
  let decodedToken;

  if (ctx.req.headers.authorization) {
      const access_token = ctx.req.headers.authorization.replace('Bearer ', '');

      if (!access_token) {
          passTokenToNext = false;
      } else {
          try {
              decodedToken = await checkTokenIsValid(access_token);
              console.log(`decodedToken: ${JSON.stringify(decodedToken)}`);
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
                  ...decodedToken
              },
          }
      });
  } else {
      console.log(`Authorization header was not provided, moving to session logic`)
      if (!ctx.session || !ctx.session.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: `Invalid Session` });
      }
      console.log(`Session was present, next on middleware ${ctx.session.user.name}`)
      return next({
          ctx: {
              // infers the `session` as non-nullable
              session: { ...ctx.session, user: ctx.session.user },
          },
      });
  }
});
/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);