import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema, verifySchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { generate5DigitOTP } from '../../../utils/math'
import { sendEmail } from '../../../utils/notification/sendEmail';
import { sendSMS } from '../../../utils/notification/sendSMS';
import { sendPushNotification } from '../../../utils/notification/sendPush'
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
        .input(params)
        .mutation(async ({ ctx, input }) => {

            const alertMethodId = input.alertMethodId;

            // Get the current date
            const currentDate = new Date().toISOString().split('T')[0];

            // Check if the verification tracking record exists for the current user and alertMethodId
            const verificationRecord = await ctx.prisma.verificationTracking.findFirst({
                where: {
                    alertMethodId,
                },
            });

            if (verificationRecord) {
                // Check if the date is the same
                if (verificationRecord.date === currentDate) {
                    // Check if the attempt count has reached the maximum limit (e.g., 3)
                    if (verificationRecord.attemptCount >= 3) {
                        return {
                            status: 403,
                            message: 'Exceeded maximum verification attempts for the day',
                        };
                    }
                    // Increment the attempt count
                    await ctx.prisma.verificationTracking.update({
                        where: {
                            id: verificationRecord.id,
                        },
                        data: {
                            attemptCount: verificationRecord.attemptCount + 1,
                        },
                    });
                } else {
                    // Refresh the attempt count to 1 for a new date
                    await ctx.prisma.verificationTracking.update({
                        where: {
                            id: verificationRecord.id,
                        },
                        data: {
                            date: currentDate,
                            attemptCount: 1,
                        },
                    });
                }
            } else {
                // Create a new verification tracking record
                await ctx.prisma.verificationTracking.create({
                    data: {
                        alertMethodId,
                        date: currentDate,
                        attemptCount: 1,
                    },
                });
            }

            const otp = generate5DigitOTP()
            const message = `Your FireAlert Verification OTP is ${otp}`
            const alertMethod = await ctx.prisma.alertMethod.findFirst({
                where: {
                    id: input.alertMethodId
                }
            })
            if (!alertMethod) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "AlertMethod with that AlertMethod Id not found",
                });
            }
            if (alertMethod.isVerified) {
                return {
                    message: 'User is already verified'
                }
            }
            await ctx.prisma.alertMethod.update({
                where: {
                    id: input.alertMethodId
                },
                data: {
                    notificationToken: otp
                }
            })
            const destination = alertMethod.destination
            const method = alertMethod.method
            if (method === 'email') {
                const emailAddress = destination
                const emailSent = await sendEmail(emailAddress, "FireAlert Verification", message);
                if (emailSent) {
                    return { status: 200, message: "Code sent to user" };
                }
            } else if (method === 'sms') {
                const phoneNumber = destination
                const smsSent = await sendSMS(phoneNumber, message);
                if (smsSent) {
                    return { status: 200, message: "Code sent to user" };
                }
            } else if (method === 'device') {
                const deviceType = alertMethod.deviceType
                const pushTokenIdentifier = destination
                if (deviceType === 'ios') {
                    const iosPushSent = await sendPushNotification(pushTokenIdentifier, message);
                    if (iosPushSent) {
                        return { status: 200, message: "Code sent to user" };
                    }
                } else if (deviceType === 'android') {
                    const androidPushSent = await sendPushNotification(pushTokenIdentifier, message);
                    if (androidPushSent) {
                        return { status: 200, message: "Code sent to user" };
                    }
                }
            }
        }),

    verify: protectedProcedure
        .input(verifySchema)
        .mutation(async ({ ctx, input }) => {
            const alertMethod = await ctx.prisma.alertMethod.findFirst({
                where: {
                    id: input.alertMethodId
                }
            })
            if (!alertMethod) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "AlertMethod with that AlertMethod Id not found",
                });
            }
            if (alertMethod.notificationToken === input.notificationToken) {
                await ctx.prisma.alertMethod.update({
                    where: {
                        id: input.alertMethodId
                    },
                    data: {
                        isVerified: true
                    }
                })
                return {
                    status: 400,
                    message: 'Validation Successful'
                }
            } else {
                return {
                    status: 406,
                    message: 'incorrect token'
                }
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

                // Send verification code
                const otp = generate5DigitOTP();
                const message = `Your FireAlert Verification OTP is ${otp}`;

                if (input.method === 'email') {
                    const emailAddress = input.destination;
                    const emailSent = await sendEmail(emailAddress, "FireAlert Verification", message);
                    if (!emailSent) {
                        throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Failed to send verification code via email",
                        });
                    }
                } else if (input.method === 'sms') {
                    const phoneNumber = input.destination;
                    const smsSent = await sendSMS(phoneNumber, message);
                    if (!smsSent) {
                        throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Failed to send verification code via SMS",
                        });
                    }
                } else if (input.method === 'device') {
                    const pushTokenIdentifier = input.destination;
                    if (input.deviceType === 'ios') {
                        const iosPushSent = await sendPushNotification(pushTokenIdentifier, message);
                        if (!iosPushSent) {
                            throw new TRPCError({
                                code: "INTERNAL_SERVER_ERROR",
                                message: "Failed to send verification code via iOS push notification",
                            });
                        }
                    } else if (input.deviceType === 'android') {
                        const androidPushSent = await sendPushNotification(pushTokenIdentifier, message);
                        if (!androidPushSent) {
                            throw new TRPCError({
                                code: "INTERNAL_SERVER_ERROR",
                                message: "Failed to send verification code via Android push notification",
                            });
                        }
                    }
                }

                return {
                    status: 'success',
                    data: {
                        alertMethod,
                    },
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
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
