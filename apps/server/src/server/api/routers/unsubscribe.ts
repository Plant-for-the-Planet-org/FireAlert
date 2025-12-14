import {z} from 'zod';
import {createTRPCRouter, publicProcedure} from '../trpc';
import {unsubscribeService} from '../../../Services/AlertMethod/UnsubscribeService';

export const unsubscribeRouter = createTRPCRouter({
  /**
   * Validates an unsubscribe token and returns validation details
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, 'Token is required'),
      }),
    )
    .query(async ({input}) => {
      const {token} = input;

      try {
        const validation = await unsubscribeService.validateToken(token);

        return {
          isValid: validation.isValid,
          isExpired: validation.isExpired,
          hasAlertMethod: !!validation.alertMethod,
          hasUser: !!validation.user,
          alertMethodDestination: validation.alertMethod?.destination,
          userName: validation.user?.name,
        };
      } catch (error) {
        return {
          isValid: false,
          isExpired: false,
          hasAlertMethod: false,
          hasUser: false,
          error: 'Failed to validate token',
        };
      }
    }),

  /**
   * Processes an unsubscribe request
   */
  processUnsubscribe: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, 'Token is required'),
      }),
    )
    .mutation(async ({input}) => {
      const {token} = input;

      try {
        const result = await unsubscribeService.processUnsubscribe(token);

        return {
          success: result.success,
          message: result.message,
          alertMethodId: result.alertMethodId,
        };
      } catch (error) {
        return {
          success: false,
          message:
            'An unexpected error occurred while processing your unsubscribe request. Please try again later.',
        };
      }
    }),
});
