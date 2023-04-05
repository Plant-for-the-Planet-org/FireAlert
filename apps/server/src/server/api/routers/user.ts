import { TRPCError } from "@trpc/server";
import { params, updateUserSchema } from '../zodSchemas/user.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";

export const userRouter = createTRPCRouter({
    getUser: protectedProcedure
        .input(params)
        .query(async({ctx, input}) => {
            try{
                const user = await ctx.prisma.user.findFirst({
                    where: { id: input.userId}
                })
                return{
                    status: 'success',
                    data: user,
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot find a user with that id!'
                });
            }
        }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input}) => {
            try{
                const paramsInput = input.params
                const body = input.body
                const updatedUser = await ctx.prisma.user.update({
                    where: {id: paramsInput.userId},
                    data: body,
                })
                return{
                    status: 'success',
                    data: updatedUser,
                }
            }catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot update that user!'
                })
            }
        }),
    
    deleteUser: protectedProcedure
        .input(params)
        .mutation(async ({ctx, input}) => {
            try{
                const deletedUser = await ctx.prisma.user.delete({
                    where: {id: input.userId}
                })
                return{
                    status: 'success',
                    data: deletedUser
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Probably user with that Id is not found, so cannot delete user'
                });
            }
        }),
    
});

export type UserRouter = typeof userRouter


