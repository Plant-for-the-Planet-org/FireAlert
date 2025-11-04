import {AppError} from './AppError';

export class ProviderNotFoundError extends AppError {
  readonly errorCode = 'PROVIDER_NOT_FOUND';

  constructor(providerKey: string, context?: Record<string, any>) {
    super(
      'NOT_FOUND',
      `GeoEvent provider with key '${providerKey}' not found`,
      undefined,
      {providerKey, ...context},
    );
  }
}

export class ProviderAlreadyRegisteredError extends AppError {
  readonly errorCode = 'PROVIDER_ALREADY_REGISTERED';

  constructor(providerKey: string, context?: Record<string, any>) {
    super(
      'CONFLICT',
      `Provider for key '${providerKey}' has already been registered`,
      undefined,
      {providerKey, ...context},
    );
  }
}

export class ProviderConfigurationError extends AppError {
  readonly errorCode = 'PROVIDER_CONFIGURATION_ERROR';

  constructor(
    providerKey: string,
    missingProperty: string,
    context?: Record<string, any>,
  ) {
    super(
      'BAD_REQUEST',
      `Invalid or incomplete provider configuration for '${providerKey}': Missing property '${missingProperty}'`,
      undefined,
      {providerKey, missingProperty, ...context},
    );
  }
}

export class ProviderDataFetchError extends AppError {
  readonly errorCode = 'PROVIDER_DATA_FETCH_ERROR';

  constructor(
    providerKey: string,
    cause?: unknown,
    context?: Record<string, any>,
  ) {
    super(
      'INTERNAL_SERVER_ERROR',
      `Failed to fetch data from provider '${providerKey}'`,
      cause,
      {providerKey, ...context},
    );
  }
}

export class ProviderValidationError extends AppError {
  readonly errorCode = 'PROVIDER_VALIDATION_ERROR';

  constructor(
    providerKey: string,
    validationErrors: string[],
    context?: Record<string, any>,
  ) {
    super(
      'BAD_REQUEST',
      `Provider '${providerKey}' validation failed: ${validationErrors.join(
        ', ',
      )}`,
      undefined,
      {providerKey, validationErrors, ...context},
    );
  }
}

export class ProviderApiError extends AppError {
  readonly errorCode = 'PROVIDER_API_ERROR';

  constructor(
    providerKey: string,
    statusCode: number,
    message: string,
    context?: Record<string, any>,
  ) {
    super(
      'INTERNAL_SERVER_ERROR',
      `API error from provider '${providerKey}' (${statusCode}): ${message}`,
      undefined,
      {providerKey, statusCode, apiMessage: message, ...context},
    );
  }
}

export class ProviderDataParsingError extends AppError {
  readonly errorCode = 'PROVIDER_DATA_PARSING_ERROR';

  constructor(
    providerKey: string,
    dataFormat: string,
    cause?: unknown,
    context?: Record<string, any>,
  ) {
    super(
      'INTERNAL_SERVER_ERROR',
      `Failed to parse ${dataFormat} data from provider '${providerKey}'`,
      cause,
      {providerKey, dataFormat, ...context},
    );
  }
}
