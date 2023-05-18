import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema, verifySchema, ParamsType } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { generate5DigitOTP } from '../../../utils/math'
import { sendVerificationCode } from '../../../utils/notification/sendVerificationCode'
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"
import { AlertMethod } from "@prisma/client";

interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}


type checkUserHasAlertMethodPermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    alertMethodId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};

type CtxWithAlertMethod = {
    ctx: TRPCContext;
    alertMethod: AlertMethod;
}

type CtxWithAlertMethodId = {
    ctx: TRPCContext;
    alertMethodId: string
}

type CtxWithUserID = {
    ctx: TRPCContext;
    userId: string;
    count: number;
}
const limitAlertMethodPerUser = async ({ ctx, userId, count }: CtxWithUserID) => {
    const alertMethodCount = await ctx.prisma.alertMethod.count({
        where: {
            userId,
        },
    });
    if (alertMethodCount >= count) {
        return {
            status: 403,
            message: 'Exceeded maximum alert methods limit',
        };
    }
}

// Compares the User in session or token with the AlertMethod that is being Read, Updated or Deleted
const checkUserHasAlertMethodPermission = async ({ ctx, alertMethodId, userId }: checkUserHasAlertMethodPermissionArgs) => {
    const alertMethodToCRUD = await ctx.prisma.alertMethod.findFirst({
        where: {
            id: alertMethodId,
        },
        select: {
            userId: true,
            destination: true,
            method: true,
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
    return alertMethodToCRUD
};

const handleOTPSendLimitation = async ({ ctx, alertMethod }: CtxWithAlertMethod) => {
    // Get the current date
    const currentDate = new Date().toISOString().split('T')[0];
    // alertMethodId
    const alertMethodId = alertMethod.id;
    // Check if the date is the same
    if (
        alertMethod.lastTokenSentDate &&
        alertMethod.lastTokenSentDate.toISOString().split('T')[0] === currentDate
    ) {
        // Check if the attempt count has reached the maximum limit (e.g., 3)
        if (alertMethod.tokenSentCount >= 3) {
            return {
                status: 403,
                message: 'Exceeded maximum verification attempts for the day',
            };
        }
        // Increment the tokenSentCount
        await ctx.prisma.alertMethod.update({
            where: {
                id: alertMethodId,
            },
            data: {
                tokenSentCount: alertMethod.tokenSentCount + 1,
            },
        });
    } else {
        // Reset tokenSentCount to 1 for a new date
        await ctx.prisma.alertMethod.update({
            where: {
                id: alertMethodId,
            },
            data: {
                tokenSentCount: 1,
                lastTokenSentDate: new Date(),
            },
        });
    }
}

const storeOTPInVerificationRequest = async ({ ctx, alertMethod }: CtxWithAlertMethod) => {
    const alertMethodId = alertMethod.id;

    // Find the existing verificationRequest for the alertMethod
    const existingVerificationRequest = await ctx.prisma.verificationRequest.findFirst({
        where: {
            alertMethodId: alertMethodId,
        },
    });

    // Generate a new verification token
    const otp = generate5DigitOTP();
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    if (existingVerificationRequest) {
        // Update the existing verificationRequest with new token and expiration date
        await ctx.prisma.verificationRequest.update({
            where: {
                id: existingVerificationRequest.id,
            },
            data: {
                token: otp,
                expires: expirationDate,
            },
        });
    } else {
        // Create a new verificationRequest
        await ctx.prisma.verificationRequest.create({
            data: {
                token: otp,
                expires: expirationDate,
                alertMethod: {
                    connect: {
                        id: alertMethodId,
                    },
                },
            },
        });
    }
    return otp;
}

const findAlertMethod = async ({ ctx, alertMethodId }: CtxWithAlertMethodId) => {
    const alertMethod = await ctx.prisma.alertMethod.findFirst({
        where: {
            id: alertMethodId
        }
    })
    if (!alertMethod) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "AlertMethod with that AlertMethod Id not found",
        });
    }
    return alertMethod
}

const findVerificationRequest = async ({ ctx, alertMethodId }: CtxWithAlertMethodId) => {
    const verificationRequest = await ctx.prisma.verificationRequest.findFirst({
        where: {
            alertMethodId: alertMethodId
        }
    })
    if (!verificationRequest) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Verification Token for that alertMethod is not found",
        });
    }
    return verificationRequest
}


export const alertMethodRouter = createTRPCRouter({

    sendVerification: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            const alertMethodId = input.alertMethodId
            const alertMethod = await findAlertMethod({ ctx, alertMethodId })
            if (alertMethod.isVerified) {
                return {
                    message: 'User is already verified'
                }
            }
            await handleOTPSendLimitation({ ctx, alertMethod })
            const otp = await storeOTPInVerificationRequest({ ctx, alertMethod })
            const message = `Your FireAlert Verification OTP is ${otp}`;
            const destination = alertMethod.destination
            const method = alertMethod.method
            const deviceType = alertMethod.deviceType ?? undefined
            const verification = await sendVerificationCode(destination, method, deviceType, message)
            return verification;
        }),

    verify: protectedProcedure
        .input(verifySchema)
        .mutation(async ({ ctx, input }) => {
            const alertMethodId = input.alertMethodId
            await findAlertMethod({ ctx, alertMethodId })
            const verificatonRequest = await findVerificationRequest({ ctx, alertMethodId })
            const currentTime = new Date();
            // TODO: Also check if it is expired or not, by checking if the verificationRequest.expires is less than the time right now, if yes, set isExpired to true.
            if (verificatonRequest.token === input.token && (verificatonRequest.expires >= currentTime)) {
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
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            await limitAlertMethodPerUser({ ctx, userId, count: 5 })
            try {
                const otp = generate5DigitOTP();
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        method: input.method,
                        destination: input.destination,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        userId: userId,
                    },
                });
                // Send verification code
                const message = `Your FireAlert Verification OTP is ${otp}`;
                const destination = alertMethod.destination
                const method = alertMethod.method
                const deviceType = alertMethod.deviceType ?? undefined
                const verification = await sendVerificationCode(destination, method, deviceType, message)

                return {
                    status: 'success',
                    data: {
                        alertMethod,
                        verification
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
                const alertMethodId = input.alertMethodId
                const alertMethod = await findAlertMethod({ ctx, alertMethodId })
                return {
                    status: 'success',
                    data: alertMethod,
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
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.params.alertMethodId, userId: userId });
            try {
                const { method, destination } = input.body;
                // Check to see if method or destination has changed
                const isMethodChanged = method && existingAlertMethod.method !== method;
                const isDestinationChanged = destination && existingAlertMethod.destination !== destination;
                // If either destination or method has changed, make isVerified to false
                const isVerified = !(isDestinationChanged || isMethodChanged);

                const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                    where: {
                        id: input.params.alertMethodId,
                    },
                    data: {
                        ...input.body,
                        isVerified: isVerified
                    },
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
