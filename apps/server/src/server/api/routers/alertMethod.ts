import { TRPCError } from "@trpc/server";
import { 
    createAlertMethodSchema, 
    params, 
    updateAlertMethodSchema, 
    verifySchema} from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { generate5DigitOTP } from '../../../utils/notification/otp'
import { sendVerificationCode } from '../../../utils/notification/sendVerificationCode'
import { checkSoftDeleted } from "../../../utils/authorization/checks";
import { 
    findAlertMethod, 
    handleOTPSendLimitation, 
    storeOTPInVerificationRequest, 
    findVerificationRequest, 
    limitAlertMethodPerUser, 
    checkUserHasAlertMethodPermission,
} from "../../../utils/routers/alertMethod";

export const alertMethodRouter = createTRPCRouter({

    sendVerification: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            await checkSoftDeleted(ctx)
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
            await checkSoftDeleted(ctx)
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
            const user = await checkSoftDeleted(ctx)
            // Check if the user has reached the maximum limit of alert methods (e.g., 5)
            await limitAlertMethodPerUser({ ctx, userId: user.id, count: 5 })
            try {
                const otp = generate5DigitOTP();
                const alertMethod = await ctx.prisma.alertMethod.create({
                    data: {
                        method: input.method,
                        destination: input.destination,
                        isEnabled: input.isEnabled,
                        deviceType: input.deviceType,
                        userId: user.id,
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
            const user = await checkSoftDeleted(ctx)
            try {
                const alertMethods = await ctx.prisma.alertMethod.findMany({
                    where: {
                        userId: user.id,
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
            const user = await checkSoftDeleted(ctx)
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: user.id });
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
            const user = await checkSoftDeleted(ctx)
            const existingAlertMethod = await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.params.alertMethodId, userId: user.id });
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
            const user = await checkSoftDeleted(ctx)
            await checkUserHasAlertMethodPermission({ ctx, alertMethodId: input.alertMethodId, userId: user.id });
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
