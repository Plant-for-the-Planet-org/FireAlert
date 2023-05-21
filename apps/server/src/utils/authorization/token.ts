import jwt, { VerifyOptions } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { TRPCError } from '@trpc/server';
import { type InnerTRPCContext } from '../../server/api/trpc'
import { PPJwtPayload } from "../../utils/routers/trpc"
import { prisma } from '../../server/db'


interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}


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

    const options: VerifyOptions = {
        algorithms: ['RS256'],
        // audience: 'urn:plant-for-the-planet',
        issuer: "https://accounts.plant-for-the-planet.org/"
    };
    return jwt.verify(token, signingKey, options);
};

// Find the account which has the sub from token and find userId for that account
export async function getUserIdByToken(ctx: TRPCContext) {
    const user = await ctx.prisma.user.findFirst({
        where: {
            email: ctx.token["https://app.plant-for-the-planet.org/email"]
        },
        select: {
            id: true,
        },
    });
    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cannot find user associated with the token, make sure the user has logged in atleast once",
        });
    }
    return user.id;
}
