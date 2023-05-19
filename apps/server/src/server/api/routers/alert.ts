import { TRPCError } from "@trpc/server";
import { queryAlertSchema } from '../zodSchemas/alert.schema'
import { params as siteParams } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";

import { Alert } from "@prisma/client";
import { getUserIdByToken } from "../../../utils/token";
import { subtractDays } from "../../../utils/date";

export const alertRouter = createTRPCRouter({

    getAlertsForSite: protectedProcedure
        .input(siteParams)
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
                if (!userId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User ID not found",
                    });
                }
                const thirtyDaysAgo = subtractDays(new Date(), 30);
                const alertsForSite = await ctx.prisma.alert.findMany({
                    where: {
                        siteId: input.siteId,
                        eventDate: {
                            gte: thirtyDaysAgo
                        },
                    }
                })
                return {
                    status: 'success',
                    data: alertsForSite,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    getAlertsForUser: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
                if (!userId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User ID not found",
                    });
                }
                const alertsForUser: Alert[] = [];
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId,
                    },
                });

                // Fetch alerts for each site
                for (const site of sites) {
                    const thirtyDaysAgo = subtractDays(new Date(), 30);
                    const alertsForEachSite = await ctx.prisma.alert.findMany({
                        where: {
                            siteId: site.id,
                            eventDate: {
                                gte: thirtyDaysAgo
                            },
                        },
                    });
                    alertsForUser.push(...alertsForEachSite);
                }
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
            try {
                const alert = await ctx.prisma.alert.findFirst({
                    where: { id: input.alertId }
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

    deleteAnAlert: protectedProcedure
        .input(queryAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const deletedAlert = await ctx.prisma.alert.delete({
                    where: { id: input.alertId }
                })
                return {
                    status: 'success',
                    data: deletedAlert
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
