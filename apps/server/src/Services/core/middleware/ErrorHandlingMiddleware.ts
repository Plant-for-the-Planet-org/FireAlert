import {TRPCError} from '@trpc/server';
import type {Context} from '../../../Interfaces/Context';
import {AppError} from '../errors/AppError';

export interface ErrorContext {
  userId?: string;
  operation?: string;
  timestamp: Date;
  requestId?: string;
}

export class ErrorHandlingMiddleware {
  static handleError(
    error: unknown,
    context: Context,
    operation?: string,
  ): never {
    const errorContext: ErrorContext = {
      userId: context.user?.id,
      operation,
      timestamp: new Date(),
      requestId: context.requestId,
    };

    // Log the error with context
    console.error('Error occurred:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: errorContext,
    });

    // If it's already an AppError or TRPCError, re-throw it
    if (error instanceof AppError || error instanceof TRPCError) {
      throw error;
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;

      switch (prismaError.code) {
        case 'P2002':
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A record with this data already exists',
            cause: error,
          });
        case 'P2025':
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Record not found',
            cause: error,
          });
        case 'P2003':
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Foreign key constraint failed',
            cause: error,
          });
        default:
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database operation failed',
            cause: error,
          });
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        cause: error,
      });
    }

    // Fallback for unknown error types
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unknown error occurred',
      cause: error,
    });
  }

  static wrapServiceCall<T>(
    serviceCall: () => Promise<T>,
    context: Context,
    operation?: string,
  ): Promise<T> {
    return serviceCall().catch(error => {
      this.handleError(error, context, operation);
    });
  }
}
