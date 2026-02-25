import {type NotificationStatus} from '@prisma/client';

export type IncidentNotificationType = 'START' | 'END' | 'MERGE';

export interface IncidentNotificationMetadata {
  type: 'INCIDENT_START' | 'INCIDENT_END' | 'INCIDENT_MERGE';
  incidentId: string;
  siteId: string;
  siteName: string;
  detectionCount?: number; // Only for END
  durationMinutes?: number; // Only for END
  mergeSourceCount?: number; // Only for MERGE
}

export interface NotificationQueueItem {
  siteAlertId: string;
  siteIncidentId: string;
  siteId: string;
  alertMethod: string;
  destination: string;
  notificationStatus: NotificationStatus;
  metadata: IncidentNotificationMetadata;
}

export interface ProcessResult {
  processedCount: number;
  errors: string[];
}
