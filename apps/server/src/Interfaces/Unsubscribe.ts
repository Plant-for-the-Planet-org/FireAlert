import type {AlertMethod, User} from '@prisma/client';
import type {UnsubscribeTokenPayload} from '../utils/unsubscribe/tokenEncryption';

export interface UnsubscribeTokenValidation {
  isValid: boolean;
  isExpired: boolean;
  payload?: UnsubscribeTokenPayload;
  alertMethod?: AlertMethod;
  user?: User;
}

export interface UnsubscribeResult {
  success: boolean;
  message: string;
  alertMethodId?: string;
}

export interface UnsubscribeService {
  generateToken(alertMethodId: string, userId: string): string;
  validateToken(token: string): Promise<UnsubscribeTokenValidation>;
  processUnsubscribe(token: string): Promise<UnsubscribeResult>;
}

export interface UnsubscribeAuditLog {
  action:
    | 'unsubscribe_processed'
    | 'token_generated'
    | 'token_validation_failed';
  userId: string;
  alertMethodId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  errorReason?: string; // For failed validations
}
