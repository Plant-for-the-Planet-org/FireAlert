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
import {
    findAlertMethod,
    findVerificationRequest,
    limitAlertMethodPerUser,
    checkUserHasAlertMethodPermission,
    returnAlertMethod,
    handlePendingVerification,
    deviceVerification
} from "../../../utils/routers/alertMethod";
import { logger } from "../../../../src/server/logger";

export const alertMethodRouter = createTRPCRouter({

    //Todo: Abstract the functions in SendVerification and createAlertMethod to a separate file so that it can be reused in the verify function.
    sendVerification: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user!.id;
            try {
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod(alertMethodId, userId)
                if (alertMethod.isVerified) {
                    return {
                        status: 'success',
                        message: "alertMethod is already verified."
                    }
                } else {
                    const sendVerification = await handlePendingVerification(ctx, alertMethod)
                    if (sendVerification.status === 'success') {
                        return sendVerification
                    }
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `${sendVerification.message}`,
                    });
                }
            } catch (error) {
                logger(`Error in sendVerification: ${error}`, "error");
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `${error}`,
                });
            }
        }),

    verify: publicProcedure
        .input(verifySchema)
        .mutation(async ({ ctx, input }) => {
            const alertMethodId = input.params.alertMethodId
            await findAlertMethod(alertMethodId)
            const verificatonRequest = await findVerificationRequest(alertMethodId)
            const currentTime = new Date();
            // TODO: Also check if it is expired or not, by checking if the verificationRequest.expires is less than the time right now, if yes, set isExpired to true.
            if (verificatonRequest.expires < currentTime) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: `OTP Token Expired. Request a new OTP.`,
                });
            }
            if (verificatonRequest.token === input.body.token) {
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
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: `Incorrect token`,
                });
            }
        }),

    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user!.id;
            //Check if that AlertMethod already exists
            const existingAlertMethod = await ctx.prisma.alertMethod.findFirst({
                where: {
                    userId: userId,
                    destination: input.destination,
                    method: input.method,
                },
            });
            // If the existing alertMethod has been soft deleted, un-soft delete it, and return success
            if (existingAlertMethod?.deletedAt) {
                const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                    where: {
                        id: existingAlertMethod.id,
                    },
                    data: {
                        deletedAt: null,
                    }
                });
                return {
                    status: 'success',
                    message: 'Deleted alertMethod has been restored',
                    data: updatedAlertMethod,
                }
            }
            // If existing alertMethod hasn't been soft deleted, but exists, then return sucess
            if (existingAlertMethod) {
                return {
                    status: 'success',
                    message: 'AlertMethod already exists',
                    data: returnAlertMethod(existingAlertMethod)
                };
            }
            // If existing alertMethod doesn't exist:
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            await limitAlertMethodPerUser({ ctx, userId: userId, count: 10 })

            // If the alertMethod method is device then try deviceVerification, if it fails, throw an error, if it succeds create alertMethod

            // If a user Logs out and logs in with a new user on the same device, the destination does not change. This results in multiple alertMethods with the same destination. 
            // To fix this, we should remove the AlertMethod from the previous user and add it to the new user.
            if (input.method === 'device') {
                const isDeviceVerified = await deviceVerification(input.destination)
                if (isDeviceVerified) {

                    // Check if the destination (PlayerID) already exists in the table
                    const existingAlertMethods = await ctx.prisma.alertMethod.findMany({
                        where: {
                            destination: input.destination
                        }
                    });

                    // If it does exist and is associated with a different userId, delete it
                    for (const existingAlertMethod of existingAlertMethods) {
                        if (existingAlertMethod.userId !== userId) {
                            await ctx.prisma.alertMethod.delete({
                                where: {
                                    id: existingAlertMethod.id
                                }
                            });
                        }
                    }
                    // Now finally add the alertMethod to the user
                    const alertMethod = await ctx.prisma.alertMethod.create({
                        data: {
                            method: input.method,
                            destination: input.destination,
                            deviceName: input.deviceName,
                            deviceId: input.deviceId,
                            isVerified: true,
                            isEnabled: true,
                            userId: userId,
                        },
                    });
                    return {
                        status: 'success',
                        message: 'Device has been Verified. Successfully create alertMethod.',
                        data: alertMethod
                    }
                } else {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Device verification failed. Please try again.`,
                    });
                }
            }
            // For all other alertMethod methods, create alertMethod, then sendVerification code.
            try {
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        method: input.method,
                        destination: input.destination,
                        deviceName: input.deviceName,
                        deviceId: input.deviceId,
                        userId: userId,
                    },
                });
                // sendVerification is an object that has message key which contains either success message string or error message string.
                // Use that message string in constructing return message
                const sendVerification = await handlePendingVerification(ctx, alertMethod)
                return {
                    status: "success",
                    message: 'Successfully Created AlertMethod. ' + sendVerification.message,
                    data: returnAlertMethod(alertMethod)
                }
            } catch (error) {
                logger(`Error in createAlertMethod: ${error}`, "error");
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `${error}`,
                });
            }
        }),

    getAlertMethods: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user!.id;
            try {
                const alertMethods = await ctx.prisma.alertMethod.findMany({
                    where: {
                        userId: userId,
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
                logger(`Error in getAlertMethods: ${error}`, "error");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    getAlertMethod: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            const userId = ctx.user!.id;
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: userId });
            if (existingAlertMethod.deletedAt) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: `This alertMethod has been deleted. Please create it again.`,
                });
            }
            try {
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod(alertMethodId)
                const returnedAlertMethod = returnAlertMethod(alertMethod)
                return {
                    status: 'success',
                    data: returnedAlertMethod,
                };
            } catch (error) {
                logger(`Error in getAlertMethod: ${error}`, "error");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    updateAlertMethod: protectedProcedure
        .input(updateAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user!.id;
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.params.alertMethodId, userId: userId });
            if (existingAlertMethod.deletedAt) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `AlertMethod has been deleted. Please create it again to update it.`,
                });
            }
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
                logger(`Error in updateAlertMethod: ${error}`, "error");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    deleteAlertMethod: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user!.id;
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: userId });
            if (existingAlertMethod.deletedAt) {
                return {
                    status: "success",
                    message: `AlertMethod with id ${existingAlertMethod.id} has already been deleted.`,
                };
            }
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
                logger(`Error in deleteAlertMethod: ${error}`, "error");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
