import { TRPCError } from "@trpc/server";
import {
    createAlertMethodSchema,
    params,
    updateAlertMethodSchema,
    verifySchema
} from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../trpc";
import { getUser } from "../../../utils/routers/user";
import {
    findAlertMethod,
    findVerificationRequest,
    limitAlertMethodPerUser,
    checkUserHasAlertMethodPermission,
    returnAlertMethod,
    handlePendingVerification,
} from "../../../utils/routers/alertMethod";

export const alertMethodRouter = createTRPCRouter({

    //Todo: Abstract the functions in SendVerification and createAlertMethod to a separate file so that it can be reused in the verify function.
    sendVerification: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            try {
                await getUser(ctx)
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod({ ctx, alertMethodId })
                return (alertMethod.isVerified)
                    ? {
                        status: 'error',
                        message: 'AlertMethod is already verified'
                    }
                    : await handlePendingVerification(ctx, alertMethod)

            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `${error}`,
                });
            }

        }),

    verify: publicProcedure
        .input(verifySchema)
        .mutation(async ({ ctx, input }) => {
            await getUser(ctx)
            const alertMethodId = input.params.alertMethodId
            await findAlertMethod({ ctx, alertMethodId })
            const verificatonRequest = await findVerificationRequest({ ctx, alertMethodId })
            const currentTime = new Date();
            // TODO: Also check if it is expired or not, by checking if the verificationRequest.expires is less than the time right now, if yes, set isExpired to true.
            if (verificatonRequest.token === input.body.token && (verificatonRequest.expires >= currentTime)) {
                const alertMethod = await ctx.prisma.$transaction(async (prisma) => {
                    const alertMethod = await prisma.alertMethod.update({
                        where: {
                            id: input.params.alertMethodId
                        },
                        data: {
                            isVerified: true,
                            tokenSentCount: 0,
                            isEnabled: true,
                        }
                    })
                    await prisma.verificationRequest.delete({
                        where: {
                            id: verificatonRequest.id
                        }
                    })
                    return alertMethod
                })
                const returnedAlertMethod = returnAlertMethod(alertMethod)
                return {
                    status: 'success',
                    message: 'Validation Successful',
                    data: returnedAlertMethod
                }
            } else {
                return {
                    status: 'error',
                    message: 'incorrect token'
                }
            }
        }),

    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            //Check if AlertMethod already exists
            const existingAlertMethod = await ctx.prisma.alertMethod.findFirst({
                where: {
                    userId: user.id,
                    destination: input.destination,
                    method: input.method,
                    deletedAt: null,
                },
            });
            if (existingAlertMethod) {
                return {
                    status: 'success',
                    message: 'AlertMethod already exists',
                    data: returnAlertMethod(existingAlertMethod)
                };
            }
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            await limitAlertMethodPerUser({ ctx, userId: user.id, count: 10 })
            try {
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        method: input.method,
                        destination: input.destination,
                        deviceName: input.deviceName,
                        deviceId: input.deviceId,
                        userId: user.id,
                    },
                });
                return handlePendingVerification(ctx, alertMethod)
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `${error}`,
                });
            }
        }),

    getAlertMethods: protectedProcedure
        .query(async ({ ctx }) => {
            const user = await getUser(ctx)
            try {
                const alertMethods = await ctx.prisma.alertMethod.findMany({
                    where: {
                        userId: user.id,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        method: true,
                        destination: true,
                        isEnabled: true,
                        isVerified: true,
                        lastTokenSentDate: true,
                        userId: true,
                        deviceName: true,
                        deviceId: true
                    },
                });
                return {
                    status: 'success',
                    data: alertMethods,
                };
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
            const user = await getUser(ctx)
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: user.id });
            try {
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod({ ctx, alertMethodId })
                const returnedAlertMethod = returnAlertMethod(alertMethod)
                return {
                    status: 'success',
                    data: returnedAlertMethod,
                };
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
            const user = await getUser(ctx)
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.params.alertMethodId, userId: user.id });
            try {
                if (existingAlertMethod.isVerified !== true) {
                    throw new TRPCError({
                        code: "METHOD_NOT_SUPPORTED",
                        message: `Cannot enable alertMethod if it is not verified.`,
                    });
                }
                const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                    where: {
                        id: input.params.alertMethodId,
                    },
                    data: input.body,
                });
                const returnedAlertMethod = returnAlertMethod(updatedAlertMethod)
                return {
                    status: 'success',
                    data: returnedAlertMethod,
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
            const user = await getUser(ctx)
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: user.id });
            try {
                const deletedAlertMethod = await ctx.prisma.alertMethod.update({
                    data: {
                        deletedAt: new Date(),
                    },
                    where: {
                        id: input.alertMethodId,
                    },
                });
                return {
                    status: "success",
                    message: `Successfully deleted AlertMethod with id: ${deletedAlertMethod.id}`,
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
