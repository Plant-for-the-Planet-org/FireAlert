import jwt, {type VerifyOptions} from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {TRPCError} from '@trpc/server';
import {env} from 'src/env.mjs';

export const checkTokenIsValid = async (token: string) => {
  const client = jwksClient({
    jwksUri: `${env.NEXT_PUBLIC_AUTH0_DOMAIN}/.well-known/jwks.json`,
    // timeout: 30000 // Defaults to 30s
  });

  const decodedToken = jwt.decode(token, {complete: true});
  if (!decodedToken) {
    throw new TRPCError({code: 'UNAUTHORIZED', message: `Invalid Token`});
  }

  const {header} = decodedToken;
  const kid = header.kid;
  const key = await client.getSigningKey(kid);
  const signingKey = key.getPublicKey();

  const options: VerifyOptions = {
    algorithms: ['RS256'],
    issuer: 'https://accounts.plant-for-the-planet.org/',
  };
  return jwt.verify(token, signingKey, options);
};
