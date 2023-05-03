import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, sendVerificationSchema, updateAlertMethodSchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
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

    sendVerification: protectedProcedure
        .input(sendVerificationSchema)
        .mutation(async({ctx, input})=> {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if(input.method === 'email'){
                const userEmailAddress = input.destination
                // verification logic for email in onesignal
            }
            if(input.method === 'sms'){
                const userPhoneNumber = input.destination
                // verification logic for sms in onesignal
            }
            if(input.method === 'whatsapp'){
                const userWhatsAppNumber = input.destination
                // verification logic for whatsapp in onesignal
            }
        }),

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
                        method: input.method,
                        destination: input.destination,
                        isVerified: input.isVerified,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
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
                    message: `${error}`,
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
                // const alertMethodsWithMethodEmail = alertMethods.filter((alertMethod) => alertMethod.method === "email");
                // const alertMethodsWithMethodSMS = alertMethods.filter((alertMethod) => alertMethod.method === "sms");
                // const alertMethodsWithMethodDevice = alertMethods.filter((alertMethod) => alertMethod.method === "device");
                // return {
                //     email: alertMethodsWithMethodEmail,
                //     sms: alertMethodsWithMethodSMS,
                //     device: alertMethodsWithMethodDevice,
                // };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
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
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
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
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
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
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
