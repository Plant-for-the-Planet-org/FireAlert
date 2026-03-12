import {type SiteIncident} from '@prisma/client';

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
  reviewStatus: string;
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
  reviewStatus?: string;
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
