import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";

export const projectRouter = createTRPCRouter({

    getProjects: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = ctx.user!.id;
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
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

});