import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";
import { randomUUID } from "crypto";


export const alertMethodRouter = createTRPCRouter({

    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        guid: "almt_" + randomUUID(),
                        method: input.method,
                        destination: input.destination,
                        isVerified: input.isVerified,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        notificationToken: input.notificationToken,
                        userId: ctx.session.user.id
                    }
                })
                return {
                    status: 'success',
                    data: {
                        alertMethod,
                    }
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, alertMethod with that alertMethodId already exists!'
                });
            }
        }),
    
    getAllAlertMethods: protectedProcedure
        .query(async ({ ctx }) => {
            try{
                const alertMethods = await ctx.prisma.alertMethod.findMany({
                    where: {
                        userId: ctx.session.user.id,
                    }
                })
                return{
                    status: 'success',
                    data: alertMethods,
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Maybe the userid had an error',
            })
            }      
        }),
    
    getAlertMethod: protectedProcedure
        .input(params)
        .query(async({ctx, input}) => {
            try{
                const alertMethod = await ctx.prisma.alertMethod.findFirst({
                    where: { id: input.alertMethodId }
                })
                return{
                    status: 'success',
                    data: alertMethod,
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot find a site with that siteId!'
                })
            }
        }),
        
    updateAlertMethod: protectedProcedure
        .input(updateAlertMethodSchema)
        .mutation(async ({ ctx, input}) => {
            try{
                const paramsInput = input.params
                const body = input.body
                const updatedAlertMethod = await ctx.prisma.site.update({
                    where: {id: paramsInput.alertMethodId},
                    data: body,
                })
                return{
                    status: 'success',
                    data: updatedAlertMethod,
                }
            }catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, site with that siteID already exists!'
                });
            }
        }),
    
    deleteAlertMethod: protectedProcedure
        .input(params)
        .mutation(async ({ctx, input}) => {
            try{
                const deletedAlertMethod = await ctx.prisma.site.delete({
                    where: {id: input.alertMethodId}
                })
                return{
                    status: 'success',
                    data: deletedAlertMethod,
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Probably alertMethod with that Id is not found, so cannot delete AlertMethods'
                });
            }
        }),        
});
