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
} from "../trpc";
import { getUser } from "../../../utils/routers/user";
import {
    findAlertMethod,
    handleOTPSendLimitation,
    storeOTPInVerificationRequest,
    findVerificationRequest,
    limitAlertMethodPerUser,
    checkUserHasAlertMethodPermission,
    returnAlertMethod,
} from "../../../utils/routers/alertMethod";
import NotifierRegistry from "../../../Services/Notifier/NotifierRegistry";

export const alertMethodRouter = createTRPCRouter({

    sendVerification: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            try {
                await getUser(ctx)
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod({ ctx, alertMethodId })
                if (alertMethod.isVerified) {
                    return {
                        status: 'error',
                        message: 'AlertMethod is already verified'
                    }
                }
                await handleOTPSendLimitation({ ctx, alertMethod })
                const otp = await storeOTPInVerificationRequest({ ctx, alertMethod })

                // Use NotifierRegistry to send the verification code
                const notifier = NotifierRegistry.get(alertMethod.method)
                const destination = alertMethod.destination
                const message = `${otp} is your FireAlert one time code.`
                const subject = "Fire Alert Verification:"
                const url = `https://firealert.plant-for-the-planet.org/verify/${alertMethodId}/${otp}`

                const params = {
                    message: message,
                    subject: subject,
                    url: url,
                    alert: null,
                }
                const sendVerificationCode = notifier.notify(destination, params);
                if ((await sendVerificationCode).valueOf() === true) {
                    return {
                        status: 'success',
                        message: 'Verification code sent successfully'
                    }
                }
                else {
                    return {
                        status: 'error',
                        message: 'Error in sending verification code'
                    }
                }
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `${error}`,
                });
            }

        }),

    verify: protectedProcedure
        .input(verifySchema)
        .query(async ({ ctx, input }) => {
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
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            await limitAlertMethodPerUser({ ctx, userId: user.id, count: 5 })
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
                // Send verification code
                await handleOTPSendLimitation({ ctx, alertMethod })
                const otp = await storeOTPInVerificationRequest({ ctx, alertMethod })

                // Use NotifierRegistry to send the verification code
                const notifier = NotifierRegistry.get(alertMethod.method)
                const destination = alertMethod.destination
                const message = `${otp} is your FireAlert one time code.`
                const subject = "Fire Alert Verification:"
                const url = `https://firealert.plant-for-the-planet.org/verify/${alertMethodId}/${otp}`

                const params = {
                    message: message,
                    subject: subject,
                    url: url,
                    alert: null,
                }
                const sendVerificationCode = notifier.notify(destination, params);
                if ((await sendVerificationCode).valueOf() === true) {
                    return {
                        status: 'success',
                        message: 'Verification code sent successfully'
                    }
                }
                else {
                    return {
                        status: 'error',
                        message: 'Error in sending verification code'
                    }
                }
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
                const deletedAlertMethod = await ctx.prisma.alertMethod.delete({
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
