import { TRPCError } from '@trpc/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../../../src/env.mjs';

/**
 * This function verifies if the provided token is valid.
 *
 * @param {string} token - The JWT to be validated.
 * @returns {Promise} - A promise that resolves if the token is valid.
 * @throws {TRPCError} - Throws an error if the token is invalid or expired.
 */
 export const checkTokenIsValid = async (token: string) => {
  const jwks = createRemoteJWKSet(
    new URL(`${env.NEXT_PUBLIC_AUTH0_DOMAIN}/.well-known/jwks.json`)
  );

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.NEXT_PUBLIC_AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    });

    return payload;
  } catch (err: any) {
    if (err?.code === 'ERR_JWT_EXPIRED') {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'JWT expired' });
    }
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid Token' });
  }
};