import { TRPCError } from "@trpc/server";
import { queryAlertSchema } from '../zodSchemas/alert.schema'
import { params as siteParams } from '../zodSchemas/site.schema'
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
                const alertsForUser: SiteAlert[] = [];
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: user.id,
                    },
                });
                // Fetch alerts for each site
                for (const site of sites) {
                    const thirtyDaysAgo = subtractDays(new Date(), 30);
                    const alertsForEachSite = await ctx.prisma.siteAlert.findMany({
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
            await getUser(ctx)
            try {
                const alert = await ctx.prisma.siteAlert.findFirst({
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
