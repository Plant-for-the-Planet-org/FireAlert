import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";


export const alertRouter = createTRPCRouter({

    getAllAlerts: protectedProcedure.query(({ ctx }) => {
        const sites = ctx.prisma.site.findMany({
            where: {
                userId: ctx.session.user.id,
            }
        })
        return sites.then.apply({})
    }),
    createAlertMethod: protectedProcedure
        .input(
            z.object({
                method: z.string(),
                destination: z.string(),
                isVerified: z.boolean(),
                deviceType: z.string(),
                isEnabled: z.boolean(),
                notificationToken: z.string(),
                userId: z.string()
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.prisma.alertMethod.create({
                    data: {
                        guid: 'alertmethod' + Math.random() * 99999,
                        method: input.method,
                        destination: input.destination,
                        isVerified: input.isVerified,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        notificationToken: input.notificationToken,
                        userId: ctx.session.user.id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }),
});
