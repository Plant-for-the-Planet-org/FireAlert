import { TRPCError } from '@trpc/server';
import {TRPCContext} from '../../Interfaces/Context'
import { getUserIdByToken } from '../authorization/token';

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