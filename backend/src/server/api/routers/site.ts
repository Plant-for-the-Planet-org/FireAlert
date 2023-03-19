import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";

export const siteRouter = createTRPCRouter({

    getAllSites: protectedProcedure.query(({ ctx }) => {
        return ctx.prisma.site.findMany({
            where: {
                userId: ctx.session.user.id,
            }
        })
    }),

    createSite: protectedProcedure
        .input(
            z.object({
                type: z.string(),
                geometry: z.object({}),
                radius: z.string(),
                isMonitored: z.boolean(),
                userId: z.string()
            })
        )
        .mutation(async ({ctx, input}) => {
            try{
                await ctx.prisma.site.create({
                    data: {
                        guid: 'site' + Math.random()*99999,
                        type: input.type,
                        geometry: input.geometry,
                        radius: input.radius,
                        isMonitored: input.isMonitored,
                        userId: ctx.session.user.id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }),
});
