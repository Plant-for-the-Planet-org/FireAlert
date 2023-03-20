import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createAlertSchema, alertParams, updateAlertSchema } from '../zodSchemas/alert.schema'
import { CreateAlertInput, AlertParamsInput, UpdateAlertInput } from '../zodSchemas/alert.schema'

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
        .input(createAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.prisma.alert.create({
                    data: {
                        guid: "almt_" + Math.floor(Math.random()*999999999),
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
            } catch (error) {
                console.log(error)
            }
        }),
});
