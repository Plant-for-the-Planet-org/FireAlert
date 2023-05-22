import { TRPCError } from '@trpc/server';
import { TRPCContext } from '../../Interfaces/Context'
import { CheckUserHasAlertMethodPermissionArgs, CtxWithAlertMethod, CtxWithAlertMethodId, CtxWithUserID } from '../../Interfaces/AlertMethod'
import { generate5DigitOTP } from '../notification/otp';
import { AlertMethod, Prisma, PrismaClient, User } from '@prisma/client';


export const limitAlertMethodPerUser = async ({ ctx, userId, count }: CtxWithUserID) => {
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
export const checkUserHasAlertMethodPermission = async ({ ctx, alertMethodId, userId }: CheckUserHasAlertMethodPermissionArgs) => {
    const alertMethodToCRUD = await ctx.prisma.alertMethod.findFirst({
        where: {
            id: alertMethodId,
        }
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

export const handleOTPSendLimitation = async ({ ctx, alertMethod }: CtxWithAlertMethod) => {
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
    return alertMethod;
}

export const storeOTPInVerificationRequest = async ({ ctx, alertMethod }: CtxWithAlertMethod) => {
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

export const findAlertMethod = async ({ ctx, alertMethodId }: CtxWithAlertMethodId) => {
    const alertMethod = await ctx.prisma.alertMethod.findFirst({
        where: {
            id: alertMethodId,
            deletedAt: null
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

export const findVerificationRequest = async ({ ctx, alertMethodId }: CtxWithAlertMethodId) => {
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

interface CreateAlertMethodInPrismaTransactionArgs {
    prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">;
    ctx: TRPCContext;
    method: "email" | "sms" | "device" | "whatsapp" | "webhook";
    isEnabled: boolean;
    userId: string;
}

export async function createAlertMethodInPrismaTransaction({ prisma, ctx, method, isEnabled, userId }: CreateAlertMethodInPrismaTransactionArgs) {
    const createdAlertMethod = await prisma.alertMethod.create({
        data: {
            method: method,
            destination: ctx.token["https://app.plant-for-the-planet.org/email"],
            isVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
            isEnabled: isEnabled,
            userId: userId,
        },
    });
    return createdAlertMethod
}

export function returnAlertMethod(alertMethod: AlertMethod) {
    return {
        id: alertMethod.id,
        method: alertMethod.method,
        destination: alertMethod.destination,
        deviceType: alertMethod.deviceType,
        isEnabled: alertMethod.isEnabled,
        isVerified: alertMethod.isVerified,
        lastTokenSentDate: alertMethod.lastTokenSentDate,
        userId: alertMethod.userId
    };
}