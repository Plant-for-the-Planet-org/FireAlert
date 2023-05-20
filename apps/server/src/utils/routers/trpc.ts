import { TRPCError } from '@trpc/server';
import { InnerTRPCContext } from '../../server/api/trpc';
import { checkTokenIsValid, getUserIdByEmail } from '../../utils/authorization/token'

interface InnerCtxWithEmail {
    ctx: InnerTRPCContext,
    email: string,
    isTokenAuthentication: boolean,
}

export interface JwtPayload {
    [key: string]: any;
    iss?: string | undefined;
    sub?: string | undefined;
    aud?: string | string[] | undefined;
    exp?: number | undefined;
    nbf?: number | undefined;
    iat?: number | undefined;
    jti?: string | undefined;
}

export interface PPJwtPayload extends JwtPayload {
    "https://app.plant-for-the-planet.org/email": string;
    "https://app.plant-for-the-planet.org/email_verified": boolean;
    azp: string;
}

export async function tokenAuthentication(ctx: InnerTRPCContext) {
    let isTokenAuthentication = false;
    let decodedToken: PPJwtPayload | undefined = undefined;
    let access_token: string | undefined = undefined;
    if (ctx.req.headers.authorization) {
        access_token = ctx.req.headers.authorization.replace("Bearer ", "");
        if (!access_token) {
            isTokenAuthentication = false;
        } else {
            try {
                const decoded = await checkTokenIsValid(access_token);
                if (typeof decoded === "string") {
                    decodedToken = JSON.parse(decoded);
                } else {
                    decodedToken = decoded as PPJwtPayload;
                }
                isTokenAuthentication = true;
            } catch (error) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: `${error}` });
            }
        }
    }
    return { isTokenAuthentication, decodedToken, access_token }
}

export async function checkSoftDelete({ ctx, email, isTokenAuthentication }: InnerCtxWithEmail) {
    const userId = isTokenAuthentication ? await getUserIdByEmail(email) : ctx.session?.user?.id;
    if (!userId) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User ID not found",
        });
    }
    const user = await ctx.prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
        });
    }
    if (user?.deletedAt) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User account has been deleted. Please log in again.",
        });
    }
}
