import {AppError} from './AppError';

export class SiteNotFoundError extends AppError {
  readonly errorCode = 'SITE_NOT_FOUND';

  constructor(siteId: string, context?: Record<string, any>) {
    super('NOT_FOUND', `Site with id ${siteId} does not exist`, undefined, {
      siteId,
      ...context,
    });
  }
}

export class SitePermissionDeniedError extends AppError {
  readonly errorCode = 'SITE_PERMISSION_DENIED';

  constructor(siteId: string, userId: string, context?: Record<string, any>) {
    super(
      'FORBIDDEN',
      'You are not authorized to access this site',
      undefined,
      {siteId, userId, ...context},
    );
  }
}

export class SiteAreaExceedsLimitError extends AppError {
  readonly errorCode = 'SITE_AREA_EXCEEDS_LIMIT';

  constructor(
    area: number,
    limit: number = 1000000,
    context?: Record<string, any>,
  ) {
    super(
      'BAD_REQUEST',
      'Site area exceeds the maximum allowed size of 1 million hectares',
      undefined,
      {area, limit, ...context},
    );
  }
}

export class PlanetROSiteRestrictionError extends AppError {
  readonly errorCode = 'PLANET_RO_SITE_RESTRICTION';

  constructor(operation: string, context?: Record<string, any>) {
    super(
      'UNAUTHORIZED',
      `PlanetRO Users cannot perform ${operation} operation on this site`,
      undefined,
      {operation, ...context},
    );
  }
}

export class TestAlertLimitExceededError extends AppError {
  readonly errorCode = 'TEST_ALERT_LIMIT_EXCEEDED';

  constructor(
    currentCount: number,
    limit: number = 3,
    context?: Record<string, any>,
  ) {
    super(
      'TOO_MANY_REQUESTS',
      'You have reached the maximum number of test alerts for your account',
      undefined,
      {currentCount, limit, ...context},
    );
  }
}

export class InvalidGeometryError extends AppError {
  readonly errorCode = 'INVALID_GEOMETRY';

  constructor(geometryType: string, context?: Record<string, any>) {
    super(
      'BAD_REQUEST',
      `Invalid GeoJSON geometry type: ${geometryType}`,
      undefined,
      {geometryType, ...context},
    );
  }
}
