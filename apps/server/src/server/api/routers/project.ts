import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import {getUser} from '../../../utils/routers/user'

export const projectRouter = createTRPCRouter({

    getProjects: protectedProcedure
        .query(async ({ ctx }) => {
            try{
                const user = await getUser(ctx)
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