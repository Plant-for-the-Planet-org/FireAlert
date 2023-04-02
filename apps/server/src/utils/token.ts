import jwt, { VerifyOptions} from 'jsonwebtoken';
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

    const options:VerifyOptions = {
        algorithms: ['RS256'],
        // audience: 'urn:plant-for-the-planet',
        issuer: "https://accounts.plant-for-the-planet.org/"
    };
    return jwt.verify(token, signingKey, options);
};


// "https://app.plant-for-the-planet.org/email_verified":true,
// ctx.token = {"https://app.plant-for-the-planet.org/email":"sagar@aryal.me",
// "sub":"google-oauth2|100896438959294892699",
// "iss":"https://accounts.plant-for-the-planet.org/",
// "https://planetapp.eu.auth0.com/userinfo"],
// "aud":["urn:plant-for-the-planet",
// "azp":"Y7sMIeKHYT0P9rS3d4ICJZVzZWGyN7Zq",
// "iat":1680275204,"exp":1680448004,
// "scope":"openid profile email offline_access"}
  

