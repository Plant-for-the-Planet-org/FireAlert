import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { TRPCError } from '@trpc/server';

export const checkTokenIsValid = async (token: string) => {
    const client = jwksClient({
        jwksUri: `https://accounts.plant-for-the-planet.org/.well-known/jwks.json`,
        // timeout: 30000 // Defaults to 30s
    });

    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: `Invalid Token` });
    }

    const { header } = decodedToken;
    const kid = header.kid;
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    const options = {
        algorithms: ['RS256'],
        // audience: 'urn:plant-for-the-planet',
        issuer: `https://accounts.plant-for-the-planet.org/`
    };
    return jwt.verify(token, signingKey, options);
};


  

