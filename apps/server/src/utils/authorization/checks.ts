import { TRPCError } from '@trpc/server';
import {TRPCContext} from '../../Interfaces/Context'
import { getUserIdByToken } from './token';

export const checkSoftDeleted = async (ctx: TRPCContext) => {
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
    }
    if (user?.deletedAt) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User account has been deleted. Please log in again.",
        });
    }else{
        return user;
    }
};
