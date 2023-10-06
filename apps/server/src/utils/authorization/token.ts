import jwt, {
  type VerifyOptions,
  JsonWebTokenError,
  TokenExpiredError,
} from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {TRPCError} from '@trpc/server';
import {env} from '../../../src/env.mjs';

/**
 * This function verifies if the provided token is valid.
 *
 * @param {string} token - The JWT to be validated.
 * @returns {Promise} - A promise that resolves if the token is valid.
 * @throws {TRPCError} - Throws an error if the token is invalid or expired.
 */
export const checkTokenIsValid = async (token: string) => {
  // Create a new JWKS client
  const client = jwksClient({
    jwksUri: `${env.NEXT_PUBLIC_AUTH0_DOMAIN}/.well-known/jwks.json`,
    // timeout: 30000 // Defaults to 30s
  });

  // Decode the token
  const decodedToken = jwt.decode(token, {complete: true});
  // If decoding the token fails, throw an error
  if (!decodedToken) {
    throw new TRPCError({code: 'UNAUTHORIZED', message: `Invalid Token`});
  }

  const {header} = decodedToken;
  const kid = header.kid;

  // Get the signing key
  const key = await client.getSigningKey(kid);
  const signingKey = key.getPublicKey();

  // Options for verifying the token
  const options: VerifyOptions = {
    algorithms: ['RS256'],
    issuer: 'https://accounts.plant-for-the-planet.org/',
  };

  try {
    // Verify the token. If verification fails, an error is thrown
    return jwt.verify(token, signingKey, options);
  } catch (err) {
    // Catch the error from jwt.verify
    // If the error is due to the token being expired, throw a specific 'JWT expired' error
    // Else throw a generic 'Invalid Token' error
    if (err instanceof TokenExpiredError) {
      throw new TRPCError({code: 'UNAUTHORIZED', message: 'JWT expired'});
    } else if (err instanceof JsonWebTokenError) {
      throw new TRPCError({code: 'UNAUTHORIZED', message: 'Invalid Token'});
    }
  }
};
