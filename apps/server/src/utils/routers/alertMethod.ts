import {TRPCError} from '@trpc/server';
import {type TRPCContext} from '../../Interfaces/Context';
import {
  type CheckUserHasAlertMethodPermissionArgs,
  type CtxWithAlertMethod,
  type LimitSpecificAlertMethods,
  type LimitAlertMethodBasedOnPlanProps,
} from '../../Interfaces/AlertMethod';
import {generate5DigitOTP} from '../notification/otp';
import {
  type AlertMethod,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';
import {env} from '../../env.mjs';
import NotifierRegistry from '../../Services/Notifier/NotifierRegistry';
import {prisma} from '../../server/db';
import {sendEmailVerificationCode} from '../notification/userEmails';

export const limitSpecificAlertMethodPerUser = async ({
  ctx,
  userId,
  count,
  method
}: LimitSpecificAlertMethods) => {
  const specificAlertMethodCount = await ctx.prisma.alertMethod.count({
    where: {
      userId,
      method,
      deletedAt: null
    },
  });
  if (specificAlertMethodCount >= count) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You've exceeded the fair ${method} use limits of FireAlert. Please contact info@plant-for-the-planet to remove these limits for your account.`,
    });
  };
};

export const limitAlertMethodBasedOnPlan = async (props: LimitAlertMethodBasedOnPlanProps) => {
  const {ctx, userId, userPlan, method} = props;
  
  let countLimit = 0;

  if(userPlan === 'basic') {
      switch (method) {
          case 'email':
              countLimit = 20;
              break;
          case 'sms':
              countLimit = 5;
              break;
          case 'webhook':
              countLimit = 20;
              break;
          case 'whatsapp':
              countLimit = 5;
              break;
          default:
              return; // Or handle any other cases as required
      }
  } else if (userPlan === 'custom') {
      switch (method) {
          case 'email':
              countLimit = 50;
              break;
          case 'sms':
              countLimit = 10;
              break;
          case 'webhook':
              countLimit = 50;
              break;
          case 'whatsapp':
              countLimit = 10;
              break;
          default:
              return; // Or handle any other cases as required
      }
  }
  await limitSpecificAlertMethodPerUser({ctx, userId, count: countLimit, method});
};



// Compares the User in session or token with the AlertMethod that is being Read, Updated or Deleted
export const checkUserHasAlertMethodPermission = async ({
  ctx,
  alertMethodId,
  userId,
}: CheckUserHasAlertMethodPermissionArgs) => {
  const alertMethodToCRUD = await ctx.prisma.alertMethod.findFirst({
    where: {
      id: alertMethodId,
    },
  });
  if (!alertMethodToCRUD) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message:
        'AlertMethod with that id does not exist, cannot update alertMethod',
    });
  }
  if (alertMethodToCRUD.userId !== userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not authorized to update this alertMethod',
    });
  }
  return alertMethodToCRUD;
};

export const handleOTPSendLimitation = async ({
  ctx,
  alertMethod,
}: CtxWithAlertMethod) => {
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
};

export const storeOTPInVerificationRequest = async ({
  ctx,
  alertMethod,
}: CtxWithAlertMethod) => {
  const alertMethodId = alertMethod.id;

  // Find the existing verificationRequest for the alertMethod
  const existingVerificationRequest =
    await ctx.prisma.verificationRequest.findFirst({
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
};

export const findAlertMethod = async (
  alertMethodId: string,
  userId?: string,
) => {
  const uId = userId ? userId : undefined;
  const alertMethod = await prisma.alertMethod.findFirst({
    where: {
      id: alertMethodId,
      userId: uId,
      deletedAt: null,
    },
  });
  if (!alertMethod) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'AlertMethod with that AlertMethod Id not found',
    });
  }
  return alertMethod;
};

export const findVerificationRequest = async (alertMethodId: string) => {
  const verificationRequest = await prisma.verificationRequest.findFirst({
    where: {
      alertMethodId: alertMethodId,
    },
  });
  if (!verificationRequest) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Verification Token for that alertMethod is not found',
    });
  }
  return verificationRequest;
};

interface CreateAlertMethodInPrismaTransactionArgs {
  prisma: Omit<
    PrismaClient<
      Prisma.PrismaClientOptions,
      never,
      Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
    >,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  >;
  method: 'email' | 'sms' | 'device' | 'whatsapp' | 'webhook';
  isEnabled: boolean;
  email: string;
  isVerified: boolean;
  userId: string;
}

export async function createAlertMethodInPrismaTransaction({
  prisma,
  email,
  isVerified,
  method,
  isEnabled,
  userId,
}: CreateAlertMethodInPrismaTransactionArgs) {
  const createdAlertMethod = await prisma.alertMethod.create({
    data: {
      method: method,
      destination: email,
      isVerified: isVerified,
      isEnabled: isEnabled,
      userId: userId,
    },
  });
  return createdAlertMethod;
}

export function returnAlertMethod(alertMethod: AlertMethod) {
  return {
    id: alertMethod.id,
    method: alertMethod.method,
    destination: alertMethod.destination,
    deviceName: alertMethod.deviceName,
    deviceId: alertMethod.deviceId,
    isEnabled: alertMethod.isEnabled,
    isVerified: alertMethod.isVerified,
    lastTokenSentDate: alertMethod.lastTokenSentDate,
    userId: alertMethod.userId,
  };
}

export interface VerificationResponse {
  status: string;
  message: string;
  data?: AlertMethod;
}

export const deviceVerification = async (
  destination: string,
): Promise<boolean> => {
  // check if the playerID exists in Onesignal
  // if yes, set the alertMethod.isVerified to true
  // else return error

  // call OneSignal API to send the notification
  const playerIdUrl = `https://onesignal.com/api/v1/players/${destination}?app_id=${env.ONESIGNAL_APP_ID}`;
  const response = await fetch(playerIdUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${env.ONESIGNAL_REST_API_KEY}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
  // we can check if id in response matches the destination to return true.
  if (response.ok) {
    return true;
  } else {
    return false;
  }
};

export const handlePendingVerification = async (
  ctx: TRPCContext,
  alertMethod: AlertMethod,
): Promise<VerificationResponse> => {
  await handleOTPSendLimitation({ctx, alertMethod});
  const otp = await storeOTPInVerificationRequest({ctx, alertMethod});
  const url = `https://firealert.plant-for-the-planet.org/verify/${alertMethod.id}/?code=${otp}`;

  let sendVerificationCode;
  if (alertMethod.method === 'email') {
    sendVerificationCode = await sendEmailVerificationCode(
      ctx.user!,
      alertMethod.destination,
      otp,
      url,
    );
  } else if (alertMethod.method === 'whatsapp') {
    const notifier = NotifierRegistry.get(alertMethod.method);
    const params = {
      authenticationMessage: true,
      otp: otp
    }
    sendVerificationCode = await notifier.notify(alertMethod.destination, params);
  } else {
    // Use NotifierRegistry to send the verification code
    const notifier = NotifierRegistry.get(alertMethod.method);
    const message = `${otp} is your FireAlert one time code.`;
    const subject = 'Fire Alert Verification';
    const destination = alertMethod.destination;
    const params = {
      message: message,
      subject: subject,
      url: url,
    };
    sendVerificationCode = await notifier.notify(destination, params);
  }
  if (sendVerificationCode === true) {
    return {
      status: 'success',
      message: 'Verification code sent successfully',
      data: alertMethod,
    };
  } else {
    return {
      status: 'error',
      message: 'Failed to send verification code.',
    };
  }
};
