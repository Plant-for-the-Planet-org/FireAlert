import { TRPCError } from "@trpc/server";
import { queryAlertSchema, queryAlertForSiteSchema } from '../zodSchemas/alert.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../trpc";
import { getLocalTime, subtractDays } from "../../../utils/date";

export const alertRouter = createTRPCRouter({

    getAlerts: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = ctx.user!.id;
                const thirtyDaysAgo = subtractDays(new Date(), 30);
                const sitesWithAlerts = await ctx.prisma.site.findMany({
                    where: {
                        userId: userId,
                        deletedAt: null,
                        alerts: {
                            some: {
                                eventDate: {
                                    gte: thirtyDaysAgo,
                                },
                                deletedAt: null,
                            },
                        },
                    },
                    select: {
                        alerts: {
                            select: {
                                id: true,
                                site:{
                                    select:{
                                        id:true,
                                        name: true,
                                        project: {
                                            select: {
                                                id: true,
                                                name: true,
                                            },
                                        }
                                    },
                                },
                                eventDate: true,
                                type: true,
                                latitude: true,
                                longitude: true,
                                detectedBy: true,
                                confidence: true,
                                distance: true,
                                data: true,
                            },
                            where: {
                                eventDate: {
                                    gte: thirtyDaysAgo,
                                },
                                deletedAt: null,
                            }
                        },
                    }
                });
                // Flatten the array of site alerts
                const alertsForUser = sitesWithAlerts.flatMap(site => site.alerts);
                const returnAlertsForUser = alertsForUser.map((alert) => {
                    const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                    return {
                        ...alert,
                        localEventDate: localTime.localDate,
                        localTimeZone: localTime.timeZone,
                    }
                })
                return {
                    status: 'success',
                    data: returnAlertsForUser,
                };
            } catch (error) {
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


    getAlert: publicProcedure
        .input(queryAlertSchema)
        .query(async ({ ctx, input }) => {
            try {
                const alert = await ctx.prisma.siteAlert.findFirst({
                    where: { 
                        id: input.id 
                    },
                    select: {
                        id: true,
                        site:{
                            select:{
                                id:true,
                                name: true,
                                geometry: true,
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                }
                            },
                        },
                        eventDate: true,
                        type: true,
                        latitude: true,
                        longitude: true,
                        detectedBy: true,
                        confidence: true,
                        distance: true,
                        data: true,
                    }
                })
                if (!alert) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Alert not found`,
                    });
                }
                const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                const returnAlert = {
                    ...alert,
                    localEventDate: localTime.localDate,
                    localTimeZone: localTime.timeZone,
                }
                return {
                    status: 'success',
                    data: returnAlert,
                }
            } catch (error) {
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something went wrong!`,
                });
            }
        }),
    
        getAlertForSite: protectedProcedure
            .input(queryAlertForSiteSchema)
            .query(async ({ctx, input}) => {
                try {
                    const {siteId, durationInDays} = input;
                    const duration = durationInDays || 1;
                    // Get alerts for the site within the duration
                    const alertsForSite = await ctx.prisma.siteAlert.findMany({
                        where:{
                            siteId: siteId,
                            eventDate: {
                                gte: new Date(new Date().getTime() - duration * 24 * 60 * 60 * 1000)
                            }
                        },
                        select: {
                            id: true,
                            eventDate: true,
                            type: true,
                            latitude: true,
                            longitude: true,
                            detectedBy: true,
                            confidence: true,
                            distance: true,
                            data: true,
                        }
                    });
                    const returnAlertsForSite = alertsForSite.map((alert) => {
                        const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                        return {
                            ...alert,
                            localEventDate: localTime.localDate,
                            localTimeZone: localTime.timeZone,
                        }
                    })
                    return {
                        status: 'success',
                        data: returnAlertsForSite,
                    };
                }catch(error){
                    if (error instanceof TRPCError) {
                        // if the error is already a TRPCError, just re-throw it
                        throw error;
                    }
                    // if it's a different type of error, throw a new TRPCError
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `Something went wrong!`,
                    });
                }
            })
});
