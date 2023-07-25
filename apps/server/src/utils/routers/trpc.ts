import {TRPCError} from '@trpc/server';
import {type InnerTRPCContext} from '../../server/api/trpc';
import {checkTokenIsValid} from '../../utils/authorization/token';
import {type User} from '@prisma/client';
import {type TRPCContext} from '../../Interfaces/Context';

interface JwtPayload {
  [key: string]: any;
  iss?: string | undefined;
  sub?: string | undefined;
  aud?: string | string[] | undefined;
  exp?: number | undefined;
  nbf?: number | undefined;
  iat?: number | undefined;
  jti?: string | undefined;
}

interface PPJwtPayload extends JwtPayload {
  'https://app.plant-for-the-planet.org/email': string;
  'https://app.plant-for-the-planet.org/email_verified': boolean;
  azp: string;
}

export async function decodeToken(ctx: InnerTRPCContext) {
  let decodedToken: PPJwtPayload | undefined;
  let access_token: string | undefined;
  if (!ctx.req.headers.authorization) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Authorization header not provided`,
    });
  }
  access_token = ctx.req.headers.authorization.replace('Bearer ', '');
  if (!access_token) {
    throw new TRPCError({code: 'BAD_REQUEST', message: `Invalid Bearer token`});
  }
  // checkTokenIsValid throws a trpc error if decodedToken is not valid.
  const decoded = await checkTokenIsValid(access_token);
  if (typeof decoded === 'string') {
    decodedToken = JSON.parse(decoded);
  } else {
    decodedToken = decoded as PPJwtPayload;
  }
  return {decodedToken, access_token};
}

export async function handleSoftDelete(user: User) {
  // Check if the user is soft deleted, if yes, throw an unauthorized error.
  if (user?.deletedAt) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User account has been deleted. Please log in again.',
    });
  }
}

export function ensureAdmin(ctx: TRPCContext) {
  if (ctx.isAdmin === false) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This route is only accessible for admins`,
    });
  }
}
