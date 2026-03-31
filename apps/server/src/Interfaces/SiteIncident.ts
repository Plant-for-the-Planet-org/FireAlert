import {type SiteIncident} from '@prisma/client';

import {
  type SiteAlert,
  type Site,
  type Notification,
  SiteIncidentReviewStatus,
} from '@prisma/client';

/**
 * Core SiteIncident interface representing a grouped fire event
 */
export interface SiteIncidentInterface {
  id: string;
  siteId: string;
  startSiteAlertId: string;
  endSiteAlertId?: string | null;
  latestSiteAlertId: string;
  startedAt: Date;
  endedAt?: Date | null;
  isActive: boolean;
  isProcessed: boolean;
  startNotificationId?: string | null;
  endNotificationId?: string | null;
  reviewStatus: SiteIncidentReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncidentData {
  siteId: string;
  startSiteAlertId: string;
  latestSiteAlertId: string;
  startedAt: Date;
}

export interface UpdateIncidentData {
  latestSiteAlertId?: string;
  endSiteAlertId?: string | null;
  endedAt?: Date | null;
  isActive?: boolean;
  isProcessed?: boolean;
  startNotificationId?: string | null;
  endNotificationId?: string | null;
  reviewStatus?: SiteIncidentReviewStatus;
}

export interface IncidentMetrics {
  totalDurationMs: number;
  creationDurationMs?: number;
  associationDurationMs?: number;
  resolutionDurationMs?: number;
  geometryCalculationMs?: number;
  databaseQueryMs?: number;
  operationCount: number;
  batchSize?: number;
}

export interface ResolveResult {
  resolvedCount: number;
  errors: Array<{
    incidentId: string;
    error: Error;
  }>;
  metrics: IncidentMetrics;
}

export interface IncidentState {
  incident: SiteIncident;
  lastAlertTime: Date;
  alertCount: number;
  shouldResolve: boolean;
  inactiveMinutes: number;
}

/**
 * Geometry data for spatial operations
 */
export interface GeometryData {
  type: 'Point' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection';
  coordinates?: unknown;
  geometries?: unknown;
}

/**
 * Incident notification status
 */
export enum NotificationStatus {
  START = 'START',
  START_SENT = 'START_SENT',
  END = 'END',
  END_SENT = 'END_SENT',
}

/**
 * Incident review status
 */
export enum ReviewStatus {
  TO_REVIEW = 'TO_REVIEW',
  STOP_ALERTS = 'STOP_ALERTS',
}
