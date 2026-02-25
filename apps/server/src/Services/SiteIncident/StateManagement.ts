import {TRPCError} from '@trpc/server';
import type {SiteIncident} from '@prisma/client';

/**
 * State machine states for SiteIncident lifecycle
 */
export enum IncidentState {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

/**
 * Determines the current state of an incident based on its properties
 */
export function getIncidentState(incident: SiteIncident): IncidentState {
  if (!incident.isActive && incident.isProcessed) {
    return IncidentState.CLOSED;
  }
  if (!incident.isActive && !incident.isProcessed) {
    return IncidentState.CLOSING;
  }
  if (incident.isActive && incident.isProcessed) {
    return IncidentState.ACTIVE;
  }
  return IncidentState.CREATED;
}

/**
 * Validates if a state transition is allowed
 */
export function isValidStateTransition(
  from: IncidentState,
  to: IncidentState,
): boolean {
  const validTransitions: Record<IncidentState, IncidentState[]> = {
    [IncidentState.CREATED]: [IncidentState.ACTIVE],
    [IncidentState.ACTIVE]: [IncidentState.CLOSING],
    [IncidentState.CLOSING]: [IncidentState.CLOSED],
    [IncidentState.CLOSED]: [], // No transitions from CLOSED
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Validates that an incident can be modified
 * Throws an error if the incident is closed
 */
export function validateIncidentModifiable(incident: SiteIncident): void {
  const state = getIncidentState(incident);
  if (state === IncidentState.CLOSED) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot modify a closed incident',
    });
  }
}

/**
 * Validates that an incident can accept new alerts
 * Throws an error if the incident is not active
 */
export function validateIncidentCanAcceptAlerts(incident: SiteIncident): void {
  if (!incident.isActive) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot associate alerts with an inactive incident',
    });
  }
}

/**
 * Validates timestamp ordering
 * Ensures startedAt <= endedAt
 */
export function validateTimestampOrdering(
  startedAt: Date,
  endedAt: Date | null,
): void {
  if (endedAt && startedAt > endedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Start time must be before or equal to end time',
    });
  }
}

/**
 * Validates that required fields are set for a given state
 */
export function validateStateRequirements(incident: SiteIncident): void {
  const state = getIncidentState(incident);

  switch (state) {
    case IncidentState.CREATED:
      if (!incident.startSiteAlertId || !incident.startedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Created incident must have startSiteAlertId and startedAt',
        });
      }
      break;

    case IncidentState.ACTIVE:
      if (!incident.startNotificationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Active incident must have startNotificationId',
        });
      }
      break;

    case IncidentState.CLOSING:
      if (!incident.endedAt || !incident.endSiteAlertId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Closing incident must have endedAt and endSiteAlertId',
        });
      }
      break;

    case IncidentState.CLOSED:
      if (!incident.endNotificationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Closed incident must have endNotificationId',
        });
      }
      break;
  }

  // Validate timestamp ordering
  validateTimestampOrdering(incident.startedAt, incident.endedAt);
}
