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

import { getServerAuthSession } from "~/server/auth";
import { prisma } from "~/server/db";
import { JWT } from "next-auth/jwt";

// interface Token extends JwtPayload {
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
  token: JWT | null;
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
    token: opts.token,
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

  // Get token from the headers
  // const token = req.headers.authorization?.split(' ')[1];
  const token = await getToken({req});


  // console.log(`Token from getToken ${JSON.stringify(token)}`)


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
  // use sub as user guid
  // if user exists (go to line 91)
  // if user does not exist, throw a 401 error. 
  // then return the data that belongs to the user

  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    req,
    session,
    token
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
import { getToken } from "next-auth/jwt";
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

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  // Add alternative method to make sure that a user can also be authorized with http-authorization-header using bearer token
  console.log(`This is session from protected procedure ${JSON.stringify(ctx.session)}`)
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// const enforceTokenIsValidAndUserIsInDatabase = t.middleware(async ({ ctx, next }) => {
//   // Aa: Get the request from context
//   const req = ctx.req;
//   // Get the token from getToken() 
//   const token = await getToken({req})
 
//   // if token doesn't exist, which means the token was incorrect, user is unauthorized
//   if(!token){
//     throw new TRPCError({ code: 'UNAUTHORIZED'})
//   }
//   // check if sub from the token already exists as a providerAccountId from account table, 
//   if(token.sub === ctx.session?.account.providerAccountId){
//     // use sub as user guid
//   }
//   // if user exists (go to line 81) -> Basically call next()
//   // if user does not exist, create the new user with the information from the access token. 
//   // then add then return the user in the api call


//   console.log('Passed all checks!')

//   return next({
//     ctx: {
//       session: { ...ctx.session, user: ctx.session!.user, token}
//     }
//   })
// })

// const enforceTokenIsValid = t.middleware(async ({ ctx, next }) => {
//   // Aa: Get the request from context
//   const req = ctx.req;

//   console.log(`This is the request ${req}`)

//   if (!req){
//     throw new TRPCError({code: 'BAD_REQUEST'})
//   }
//   // console.log(`This is the request from enforceTokenIsValid ${JSON.stringify(req)}`);
//   // Get the token from getToken() 
//   const token = await getToken({req, raw:true})



//   // console.log(`This is the token from enforceTokenIsValid ${JSON.stringify(token)}`);

//   // if token doesn't exist, which means the token was incorrect, user is unauthorized
//   if(!token){
//     throw new TRPCError({ code: 'UNAUTHORIZED'})
//   }
//   // check if sub from the token already exists as a providerAccountId from account table, 
//   if(token.sub === ctx.session?.account.providerAccountId){
//     // use sub as user guid
//   }
//   // if user does not exist, throw a 401 error. 

//   // if user exists
//   // then return the data that belongs to the user


//   console.log('Passed all checks!')

//   return next({
//     ctx: {
//       session: { ...ctx.session, user: ctx.session!.user, token}
//     }
//   })
// })

// const enforceUserIsAdmin = t.middleware(({ctx, next}) => {
//   if (ctx.session?.user.roles !== 'ADMIN') {
//     throw new TRPCError({ code: 'UNAUTHORIZED'})
//   }
//   return next({
//     ctx: {
//       session: { ...ctx.session, user: ctx.session.user }
//     }
//   })
// })


/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
// export const protectedNormalApiProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceTokenIsValid);
export const protectedNormalApiProcedure = t.procedure.use(enforceUserIsAuthed);
// export const protectedUserApiProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceTokenIsValidAndUserIsInDatabase);
export const protectedUserApiProcedure = t.procedure.use(enforceUserIsAuthed);
// export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
// export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);