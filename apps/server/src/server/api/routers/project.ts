import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import {checkSoftDeleted} from '../../../utils/authorization/checks'

export const projectRouter = createTRPCRouter({

    getAllProjects: protectedProcedure
        .query(async ({ ctx }) => {
            try{
                const user = await checkSoftDeleted(ctx)
                if(!user.isPlanetRO){
                    throw new TRPCError({
                        code: "METHOD_NOT_SUPPORTED",
                        message: 'User is not planetRO, user does not have projects',
                    });
                }
                const projects = await ctx.prisma.project.findMany({
                    where: {
                        userId: user.id,
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
                    message: `${error}`,
                });
            }
        }),
        
});