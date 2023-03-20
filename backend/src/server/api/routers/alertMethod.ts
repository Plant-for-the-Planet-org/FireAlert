import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, alertMethodParams, updateAlertMethodSchema } from '../zodSchemas/alertMethod.schema'
import { CreateAlertMethodInput, AlertMethodParamsInput, UpdateAlertMethodInput } from '../zodSchemas/alertMethod.schema'

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";


export const alertMethodRouter = createTRPCRouter({

    getAllAlertMethod: protectedProcedure.query(({ ctx }) => {
        return ctx.prisma.alertMethod.findMany({
            where: {
                userId: ctx.session.user.id,
            }
        })
    }),
    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.prisma.alertMethod.create({
                    data: {
                        guid: "almt_" + Math.floor(Math.random()*999999999),
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
