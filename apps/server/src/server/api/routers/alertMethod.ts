import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";
import { randomUUID } from "crypto";
import { getUserIdByToken } from "../../../utils/token";
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"


interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}


type checkUserHasAlertMethodPermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    alertMethodId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};

// Compares the User in session or token with the AlertMethod that is being Read, Updated or Deleted
const checkUserHasAlertMethodPermission = async ({ ctx, alertMethodId, userId }: checkUserHasAlertMethodPermissionArgs) => {
    const alertMethodToCRUD = await ctx.prisma.alertMethod.findFirst({
        where: {
            id: alertMethodId,
        },
        select: {
            userId: true,
        },
    });
    if (!alertMethodToCRUD) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "AlertMethod with that id does not exist, cannot update alertMethod",
        });
    }
    if (alertMethodToCRUD.userId !== userId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to update this alertMethod",
        });
    }
};


export const alertMethodRouter = createTRPCRouter({

    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        guid: 'almt_' + randomUUID(),
                        method: input.method,
                        destination: input.destination,
                        isVerified: input.isVerified,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        notificationToken: input.notificationToken,
                        userId: userId,
                    },
                });
                return {
                    status: 'success',
                    data: {
                        alertMethod,
                    },
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Something went wrong: ${error}`,
                });
            }
        }),

    getAllAlertMethods: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const alertMethods = await ctx.prisma.alertMethod.findMany({
                    where: {
                        userId: userId,
                    }
                });
                return {
                    status: 'success',
                    data: alertMethods,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Alert methods not found',
                });
            }
        }),

    getAlertMethod: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: userId });
            try {
                const alertMethod = await ctx.prisma.alertMethod.findFirst({
                    where: {
                        id: input.alertMethodId,
                    },
                });
                if (alertMethod) {
                    return {
                        status: 'success',
                        data: alertMethod,
                    };
                } else {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Cannot find an alert method with that alertMethodId for the user associated with the ${ctx.token ? 'token' : 'session'}!`,
                    });
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Cannot get alert method',
                });
            }
        }),

    updateAlertMethod: protectedProcedure
        .input(updateAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.params.alertMethodId, userId: userId });
            try {
                const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                    where: {
                        id: input.params.alertMethodId
                    },
                    data: input.body,
                });
                return {
                    status: 'success',
                    data: updatedAlertMethod,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: 'An error occurred while updating the alert method',
                });
            }
        }),

    deleteAlertMethod: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: userId });
            try {
                const deletedAlertMethod = await ctx.prisma.alertMethod.delete({
                    where: {
                        id: input.alertMethodId,
                    },
                });
                return {
                    status: "success",
                    data: deletedAlertMethod,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: 'An error occurred while deleting the alert method',
                });
            }
        }),
});
