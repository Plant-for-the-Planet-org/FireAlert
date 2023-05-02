import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";

export const projectRouter = createTRPCRouter({

    getAllProjects: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found in session",
                });
            }
            try{
                const user = await ctx.prisma.user.findFirst({
                    where: {
                        id: userId,
                    }
                })
                if(!user){
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'User does not exist',
                    });
                }
                if(!user.isPlanetRO){
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
            }catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Error fetching projects',
                });
            }
        }),
        
});