import { TRPCError } from "@trpc/server";
import { createAlertSchema, params as alertParams, updateAlertSchema } from '../zodSchemas/alert.schema'
import { params as siteParams} from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";
import { Alert } from "@prisma/client";
import { randomUUID } from "crypto";


export const alertRouter = createTRPCRouter({

    createAlertMethod: protectedProcedure
        .input(createAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const alert = await ctx.prisma.alert.create({
                    data: {
                        guid: "alrt_" + randomUUID(),
                        type: input.type,
                        eventDate: input.eventDate,
                        detectedBy: input.detectedBy,
                        confidence: input.confidence,
                        latitude: input.latitude,
                        longitude: input.longitude,
                        frp: input.frp,
                        isRead: input.isRead,
                        siteId: input.siteId,
                    }
                })
                return {
                    status: 'success',
                    data: {
                        alert,
                    }
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, alert with that alertId already exists!'
                });
            }
        }),
    
    getAlertsForSite: protectedProcedure
        .input(siteParams)
        .query(async({ ctx, input }) => {
            try{
                const alertsForSite = await ctx.prisma.alert.findMany({
                    where: {
                        siteId: input.siteId,
                    }
                })
                return{
                    status: 'success',
                    data: alertsForSite,
                }
            }catch (error){
                console.log(error)
            }
    }),

    getAlertsForUser: protectedProcedure
        .input(siteParams)
        .query(async({ctx, input})=>{
            try{
                const alertsForUser: Alert[]= []
                const sites = await ctx.prisma.site.findMany({
                    where:{
                        userId: ctx.session.user.id,
                    }
                })
                sites.map(async(site) => {
                    const alertsForEachSite = await ctx.prisma.alert.findMany({
                        where: {
                            siteId: site.id,
                        }
                    }) 
                    alertsForUser.push(...alertsForEachSite)
                })
                return{
                    status: 'success',
                    data: alertsForUser,
                }
            }catch (error){
                console.log(error)
            }
        }), 
    
    getAlert: protectedProcedure
        .input(alertParams)
        .query(async({ctx, input}) => {
            try{
                const alert = await ctx.prisma.alert.findFirst({
                    where: {id: input.alertId}
                })
                return{
                    status: 'success',
                    data: alert,
                }
            }catch(error){
                console.log(error)
            }
        }),

    updateAlert: protectedProcedure
        .input(updateAlertSchema)
        .mutation(async({ctx, input}) => {
            try{
                const paramsInput = input.params
                const body = input.body
                const updatedAlert = await ctx.prisma.alert.update({
                    where: {id: paramsInput.alertId},
                    data: body,
                })
                return{
                    status: 'success',
                    data: updatedAlert,
                }
            }catch(error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot update that alert!'
                })
            }
        }),

    deleteAlert: protectedProcedure
        .input(alertParams)
        .mutation(async({ctx, input}) => {
            try{
                const deletedAlert = await ctx.prisma.alert.delete({
                    where: {id:input.alertId}
                })
                return {
                    status: 'success',
                    data: deletedAlert
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Probably alert with that Id is not found, so cannot delete alert'
                });
            }
        }),
});
