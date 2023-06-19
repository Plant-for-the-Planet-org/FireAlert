import { TRPCError } from "@trpc/server";
import { queryAlertSchema } from '../zodSchemas/alert.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../trpc";
import { currentDate, getLocalTime, subtractDays } from "../../../utils/date";
import { type SiteAlert } from "@prisma/client";

interface AlertWithLocalTime extends SiteAlert {
    localEventDate: string;
    localTimeZone: string;
}
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
                return {
                    status: 'success',
                    data: alertsForUser,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),


    getAlert: publicProcedure
        .input(queryAlertSchema)
        .query(async ({ ctx, input }) => {
            try {
                const alert: AlertWithLocalTime = await ctx.prisma.siteAlert.findFirst({
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
            
                // TODO: convert eventDate to localtime and add localEventDate and localTimeZone to the alert object
                const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                alert.localEventDate = localTime.localDate;
                alert.localTimeZone = localTime.timeZone;
                if (!alert) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Alert not found`,
                    });
                }
                return {
                    status: 'success',
                    data: alert,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
