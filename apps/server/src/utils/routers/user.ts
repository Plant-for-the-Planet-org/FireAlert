import { TRPCError } from '@trpc/server';
import {TRPCContext} from '../../Interfaces/Context'
import { getUserIdByToken } from '../authorization/token';
import { prisma } from '../../server/db'
import { Prisma, PrismaClient, User } from '@prisma/client';

export const getUser = async (ctx: TRPCContext) => {
    const userId = ctx.token
        ? await getUserIdByToken(ctx)
        : ctx.session?.user?.id;
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
    }else{
        return user;
    }
};

export async function getUserBySub(sub: string) {
    const user = await prisma.user.findFirst({
        where: {
            sub: sub
        }
    });
    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cannot find user associated with the token, make sure the user has logged in atleast once",
        });
    }
    return user;
}

interface CreateUserArgs {
    id?:string;
    prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">;
    name: string;
    sub: string;
    email: string;
    emailVerified: boolean;
    image: string;
    isPlanetRO: boolean;
    detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[];
}

export async function createUserInPrismaTransaction({id, prisma, sub, name, email, emailVerified, image, isPlanetRO, detectionMethods}:CreateUserArgs){
    const createdUser = await prisma.user.create({
        data: {
            id: id ? id : undefined,
            sub: sub,
            isPlanetRO: isPlanetRO,
            name: name,
            image: image,
            email: email,
            emailVerified: emailVerified,
            lastLogin: new Date(),
            detectionMethods: detectionMethods,
        },
    });
    return createdUser;
}

export function returnUser(user: User){
    return {
        id: user.id,
        sub: user.sub,
        email: user.email,
        name: user.name,
        image: user.image,
        isPlanetRO: user.isPlanetRO,
        lastLogin: user.lastLogin,
        detectionMethods: user.detectionMethods
    };
}