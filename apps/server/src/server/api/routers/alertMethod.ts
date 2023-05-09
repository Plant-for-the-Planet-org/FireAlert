import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema, verifySchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { generate5DigitOTP } from '../../../utils/math'
import { sendVerificationCode } from '../../../utils/notification/sendVerificationCode'
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
            // Find the alertMethod for that id
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

            const otp = generate5DigitOTP()
            const message = `Your FireAlert Verification OTP is ${otp}`
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
            const deviceType = alertMethod.deviceType ?? undefined
            const verificaiton = await sendVerificationCode(destination, method, deviceType, message)
            return verificaiton;
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
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            const alertMethodCount = await ctx.prisma.alertMethod.count({
                where: {
                    userId,
                },
            });

            if (alertMethodCount >= 5) {
                return {
                    status: 403,
                    message: 'Exceeded maximum alert methods limit',
                };
            }
            try {
                const otp = generate5DigitOTP();
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        method: input.method,
                        destination: input.destination,
                        isVerified: input.isVerified,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        userId: userId,
                        notificationToken: otp,
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
