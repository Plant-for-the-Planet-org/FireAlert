import {TRPCError} from '@trpc/server';

/**
 * Custom error types for SiteIncident operations
 */

export class IncidentNotFoundError extends TRPCError {
  constructor(incidentId: string) {
    super({
      code: 'NOT_FOUND',
      message: `Incident with id ${incidentId} not found`,
    });
  }
}

export class SiteNotFoundError extends TRPCError {
  constructor(siteId: string) {
    super({
      code: 'NOT_FOUND',
      message: `Site with id ${siteId} not found`,
    });
  }
}

export class DuplicateActiveIncidentError extends TRPCError {
  constructor(siteId: string) {
    super({
      code: 'CONFLICT',
      message: `An active incident already exists for site ${siteId}`,
    });
  }
}

export class ClosedIncidentModificationError extends TRPCError {
  constructor(incidentId: string) {
    super({
      code: 'BAD_REQUEST',
      message: `Cannot modify closed incident ${incidentId}`,
    });
  }
}

export class InvalidReviewStatusError extends TRPCError {
  constructor(status: string) {
    super({
      code: 'BAD_REQUEST',
      message: `Invalid review status: ${status}. Must be one of: to_review, in_review, reviewed`,
    });
  }
}

export class InvalidTimestampError extends TRPCError {
  constructor(message: string) {
    super({
      code: 'BAD_REQUEST',
      message,
    });
  }
}

export class InvalidInactivityThresholdError extends TRPCError {
  constructor() {
    super({
      code: 'BAD_REQUEST',
      message: 'Inactivity threshold must be a positive number',
    });
  }
}

export class InactiveIncidentError extends TRPCError {
  constructor(incidentId: string) {
    super({
      code: 'BAD_REQUEST',
      message: `Cannot associate alerts with inactive incident ${incidentId}`,
    });
  }
}
