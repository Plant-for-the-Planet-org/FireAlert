import {TRPCError} from '@trpc/server';
import type {TRPC_ERROR_CODE_KEY} from '@trpc/server/rpc';

export abstract class AppError extends TRPCError {
  abstract readonly errorCode: string;
  abstract readonly context?: Record<string, any>;

  constructor(
    code: TRPC_ERROR_CODE_KEY,
    message: string,
    cause?: unknown,
    context?: Record<string, any>,
  ) {
    super({code, message, cause});
    this.context = context;
  }

  toJSON() {
    return {
      name: this.constructor.name,
      errorCode: this.errorCode,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}
