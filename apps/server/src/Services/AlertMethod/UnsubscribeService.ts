import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import type {
  UnsubscribeService,
  UnsubscribeTokenValidation,
  UnsubscribeResult,
  UnsubscribeAuditLog,
} from '../../Interfaces/Unsubscribe';
import {
  encryptUnsubscribeToken,
  decryptUnsubscribeToken,
  generateExpirationTimestamp,
  isTokenExpired,
  type UnsubscribeTokenPayload,
} from '../../utils/unsubscribe/tokenEncryption';

class UnsubscribeServiceImpl implements UnsubscribeService {
  /**
   * Generates an encrypted unsubscribe token for the given AlertMethod and User
   * @param alertMethodId The ID of the AlertMethod to unsubscribe
   * @param userId The ID of the User who owns the AlertMethod
   * @returns Encrypted token string
   */
  generateToken(alertMethodId: string, userId: string): string {
    try {
      const payload: UnsubscribeTokenPayload = {
        alertMethodId,
        userId,
        expiresAt: generateExpirationTimestamp(),
      };

      const token = encryptUnsubscribeToken(payload);

      // Log token generation for audit purposes
      this.logAuditEvent({
        action: 'token_generated',
        userId,
        alertMethodId,
        timestamp: new Date(),
      });

      return token;
    } catch (error) {
      const err = error as Error;
      logger(
        `stage=Unsubscribe event=token_generation_failure user_id=${userId} alert_method_id=${alertMethodId} message="${err.message.replace(/"/g, '\\"')}" stack="${(err.stack ?? 'n/a').replace(/"/g, '\\"')}"`,
        'error',
      );
      throw new Error('Failed to generate unsubscribe token');
    }
  }

  /**
   * Validates an unsubscribe token and returns validation details
   * @param token The encrypted token to validate
   * @returns Validation result with token details
   */
  async validateToken(token: string): Promise<UnsubscribeTokenValidation> {
    try {
      // Decrypt the token
      const payload = decryptUnsubscribeToken(token);

      if (!payload) {
        this.logAuditEvent({
          action: 'token_validation_failed',
          userId: 'unknown',
          alertMethodId: 'unknown',
          timestamp: new Date(),
          errorReason: 'Token decryption failed',
        });

        return {
          isValid: false,
          isExpired: false,
        };
      }

      // Check if token has expired
      const expired = isTokenExpired(payload);

      if (expired) {
        this.logAuditEvent({
          action: 'token_validation_failed',
          userId: payload.userId,
          alertMethodId: payload.alertMethodId,
          timestamp: new Date(),
          errorReason: 'Token expired',
        });

        return {
          isValid: false,
          isExpired: true,
          payload,
        };
      }

      // Fetch AlertMethod and User from database
      const [alertMethod, user] = await Promise.all([
        prisma.alertMethod.findUnique({
          where: {id: payload.alertMethodId},
        }),
        prisma.user.findUnique({
          where: {id: payload.userId},
        }),
      ]);

      // Validate that AlertMethod exists and belongs to the User
      if (!alertMethod || !user || alertMethod.userId !== user.id) {
        this.logAuditEvent({
          action: 'token_validation_failed',
          userId: payload.userId,
          alertMethodId: payload.alertMethodId,
          timestamp: new Date(),
          errorReason: 'AlertMethod or User not found, or ownership mismatch',
        });

        return {
          isValid: false,
          isExpired: false,
          payload,
        };
      }

      return {
        isValid: true,
        isExpired: false,
        payload,
        alertMethod,
        user,
      };
    } catch (error) {
      {
        const err = error as Error;
        logger(
          `stage=Unsubscribe event=token_validation_failure message="${err.message.replace(/"/g, '\\"')}" stack="${(err.stack ?? 'n/a').replace(/"/g, '\\"')}"`,
          'error',
        );
      }

      this.logAuditEvent({
        action: 'token_validation_failed',
        userId: 'unknown',
        alertMethodId: 'unknown',
        timestamp: new Date(),
        errorReason: `Validation error: ${(error as Error).message}`,
      });

      return {
        isValid: false,
        isExpired: false,
      };
    }
  }

  /**
   * Processes an unsubscribe request by disabling the AlertMethod
   * @param token The encrypted token containing unsubscribe details
   * @returns Result of the unsubscribe operation
   */
  async processUnsubscribe(token: string): Promise<UnsubscribeResult> {
    try {
      // First validate the token
      const validation = await this.validateToken(token);

      if (!validation.isValid) {
        if (validation.isExpired) {
          return {
            success: false,
            message:
              'This unsubscribe link has expired. Please contact support if you need assistance.',
          };
        }

        return {
          success: false,
          message:
            'Invalid unsubscribe link. Please check the link or contact support.',
        };
      }

      const {payload, alertMethod} = validation;

      if (!payload || !alertMethod) {
        return {
          success: false,
          message:
            'Unable to process unsubscribe request. Please contact support.',
        };
      }

      // Check if AlertMethod is already disabled (idempotent operation)
      if (!alertMethod.isEnabled) {
        this.logAuditEvent({
          action: 'unsubscribe_processed',
          userId: payload.userId,
          alertMethodId: payload.alertMethodId,
          timestamp: new Date(),
        });

        return {
          success: true,
          message:
            'You have already been unsubscribed from email notifications.',
          alertMethodId: payload.alertMethodId,
        };
      }

      // Disable the AlertMethod
      await prisma.alertMethod.update({
        where: {id: payload.alertMethodId},
        data: {isEnabled: false},
      });

      // Log successful unsubscribe
      this.logAuditEvent({
        action: 'unsubscribe_processed',
        userId: payload.userId,
        alertMethodId: payload.alertMethodId,
        timestamp: new Date(),
      });

      logger(
        `stage=Unsubscribe event=success alert_method_id=${payload.alertMethodId} user_id=${payload.userId}`,
        'info',
      );

      return {
        success: true,
        message:
          'You have been successfully unsubscribed from email notifications.',
        alertMethodId: payload.alertMethodId,
      };
    } catch (error) {
      const err = error as Error;
      logger(
        `stage=Unsubscribe event=process_failure message="${err.message.replace(/"/g, '\\"')}" stack="${(err.stack ?? 'n/a').replace(/"/g, '\\"')}"`,
        'error',
      );

      return {
        success: false,
        message:
          'An error occurred while processing your unsubscribe request. Please try again later.',
      };
    }
  }

  /**
   * Logs audit events for unsubscribe operations.
   * `token_generated` fires for every notification (spammy) — emitted at debug.
   * User-facing actions (`unsubscribe_processed`, validation outcomes) emit at info.
   */
  private logAuditEvent(event: UnsubscribeAuditLog): void {
    try {
      const level: 'debug' | 'info' =
        event.action === 'token_generated' ? 'debug' : 'info';

      logger(
        `stage=Unsubscribe event=audit action=${event.action} user_id=${event.userId} alert_method_id=${event.alertMethodId} timestamp=${event.timestamp.toISOString()}`,
        level,
      );
    } catch (error) {
      // Don't throw errors for logging failures
      logger(
        `stage=Unsubscribe event=audit_log_failure message="${(error as Error).message.replace(/"/g, '\\"')}"`,
        'warn',
      );
    }
  }
}

// Export singleton instance
export const unsubscribeService = new UnsubscribeServiceImpl();
export default unsubscribeService;
