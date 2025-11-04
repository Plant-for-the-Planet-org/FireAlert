import {AppError} from './AppError';

export class ValidationError extends AppError {
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    field: string,
    value: any,
    reason: string,
    context?: Record<string, any>,
  ) {
    super(
      'BAD_REQUEST',
      `Validation failed for field '${field}': ${reason}`,
      undefined,
      {field, value, reason, ...context},
    );
  }
}

export class RequiredFieldError extends AppError {
  readonly errorCode = 'REQUIRED_FIELD_ERROR';

  constructor(field: string, context?: Record<string, any>) {
    super('BAD_REQUEST', `Required field '${field}' is missing`, undefined, {
      field,
      ...context,
    });
  }
}

export class InvalidInputError extends AppError {
  readonly errorCode = 'INVALID_INPUT_ERROR';

  constructor(
    input: string,
    expectedFormat: string,
    context?: Record<string, any>,
  ) {
    super(
      'BAD_REQUEST',
      `Invalid input '${input}'. Expected format: ${expectedFormat}`,
      undefined,
      {input, expectedFormat, ...context},
    );
  }
}
