import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdFromCtx } from '../../../utils/routers/trpc'

export const projectRouter = createTRPCRouter({

    getProjects: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = getUserIdFromCtx(ctx)
                if (ctx.user?.isPlanetRO === false) {
                    throw new TRPCError({
                        code: "METHOD_NOT_SUPPORTED",
                        message: 'User is not planetRO, user does not have projects',
                    });
                }
                const projects = await ctx.prisma.project.findMany({
                    where: {
                        userId: userId,
                    }
                })
                return {
                    status: 'success',
                    data: projects,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

});