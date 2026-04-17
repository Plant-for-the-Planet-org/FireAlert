/**
 * SiteIncident TypeScript Interfaces
 * Defines all data structures for the SiteIncident system
 */

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
  relatedIncidentId?: string | null;
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

/**
 * Data transfer object for creating new SiteIncidents
 */
export interface CreateIncidentData {
  siteId: string;
  startSiteAlertId: string;
  latestSiteAlertId: string;
  startedAt: Date;
  relatedIncidentId?: string | null;
  reviewStatus?: SiteIncidentReviewStatus;
}

/**
 * Data transfer object for updating existing SiteIncidents
 */
export interface UpdateIncidentData {
  latestSiteAlertId?: string;
  endSiteAlertId?: string | null;
  relatedIncidentId?: string | null;
  endedAt?: Date | null;
  isActive?: boolean;
  isProcessed?: boolean;
  startNotificationId?: string | null;
  endNotificationId?: string | null;
  reviewStatus?: SiteIncidentReviewStatus;
}

/**
 * Result of incident resolution operations
 */
export interface ResolveResult {
  resolvedCount: number;
  errors: Array<{
    incidentId: string;
    error: Error;
  }>;
  metrics: IncidentMetrics;
}

/**
 * Performance metrics for incident operations
 */
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

/**
 * Transaction context for atomic operations
 */
export interface TransactionContext {
  siteAlert: SiteAlert;
  siteIncident: SiteIncidentInterface;
  rollback(): Promise<void>;
}

/**
 * Service contract for incident processing
 */
export interface SiteIncidentIntegration {
  processNewAlert(alert: SiteAlert): Promise<SiteIncidentInterface>;
  resolveInactiveIncidents(): Promise<number>;
  associateAlertWithIncident(
    alert: SiteAlert,
    incident: SiteIncidentInterface,
  ): Promise<void>;
}

/**
 * Incident resolution configuration
 */
export interface IncidentResolutionConfig {
  inactiveHours: number;
  batchSize: number;
  enableBatching: boolean;
}

/**
 * Incident query filters
 */
export interface IncidentQueryFilters {
  siteId?: string;
  isActive?: boolean;
  isProcessed?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Incident state for resolution logic
 */
export interface IncidentState {
  incident: SiteIncidentInterface;
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
