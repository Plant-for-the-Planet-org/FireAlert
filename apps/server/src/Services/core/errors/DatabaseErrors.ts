import {AppError} from './AppError';

export class DatabaseConnectionError extends AppError {
  readonly errorCode = 'DATABASE_CONNECTION_ERROR';

  constructor(operation: string, context?: Record<string, any>) {
    super(
      'INTERNAL_SERVER_ERROR',
      `Database connection failed during ${operation}`,
      undefined,
      {operation, ...context},
    );
  }
}

export class DatabaseQueryError extends AppError {
  readonly errorCode = 'DATABASE_QUERY_ERROR';

  constructor(query: string, cause?: unknown, context?: Record<string, any>) {
    super('INTERNAL_SERVER_ERROR', `Database query failed: ${query}`, cause, {
      query,
      ...context,
    });
  }
}

export class DatabaseConstraintError extends AppError {
  readonly errorCode = 'DATABASE_CONSTRAINT_ERROR';

  constructor(
    constraint: string,
    operation: string,
    context?: Record<string, any>,
  ) {
    super(
      'CONFLICT',
      `Database constraint '${constraint}' violated during ${operation}`,
      undefined,
      {constraint, operation, ...context},
    );
  }
}

export class RecordNotFoundError extends AppError {
  readonly errorCode = 'RECORD_NOT_FOUND';

  constructor(
    table: string,
    identifier: string,
    context?: Record<string, any>,
  ) {
    super(
      'NOT_FOUND',
      `Record not found in ${table} with identifier: ${identifier}`,
      undefined,
      {table, identifier, ...context},
    );
  }
}
