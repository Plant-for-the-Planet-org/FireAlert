import { TRPCError } from "@trpc/server";
import { queryAlertSchema } from '../zodSchemas/alert.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";

import { SiteAlert } from "@prisma/client";
import { getUser } from "../../../utils/routers/user";
import { subtractDays } from "../../../utils/date";

export const alertRouter = createTRPCRouter({

    getAlerts: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const user = await getUser(ctx)
                const thirtyDaysAgo = subtractDays(new Date(), 30);
                const sitesWithAlerts = await ctx.prisma.site.findMany({
                    where: {
                        userId: user.id,
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
                    include: {
                        alerts: {
                            select: {
                                id: true,
                                siteId: true,
                                eventDate: true,
                                type: true,
                                latitude: true,
                                longitude: true,
                                detectedBy: true,
                                confidence: true,
                                distance: true,
                            },
                            where: {
                                eventDate: {
                                    gte: thirtyDaysAgo,
                                },
                                deletedAt: null,
                            },
                        },
                    },
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


    getAlert: protectedProcedure
        .input(queryAlertSchema)
        .query(async ({ ctx, input }) => {
            await getUser(ctx)
            try {
                const alert = await ctx.prisma.siteAlert.findFirst({
                    select: {
                        id: true,
                        siteId: true,
                        eventDate: true,
                        type: true,
                        latitude: true,
                        longitude: true,
                        detectedBy: true,
                        confidence: true,
                        distance: true,
                    },
                    where: { id: input.id }
                })
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
