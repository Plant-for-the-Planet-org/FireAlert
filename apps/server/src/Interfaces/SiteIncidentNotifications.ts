import {type NotificationStatus} from '@prisma/client';

export type IncidentNotificationType = 'START' | 'END';
export type IncidentMetadataType =
  | 'INCIDENT_START'
  | 'INCIDENT_END'
  | 'INCIDENT_MERGE_START'
  | 'INCIDENT_MERGE_END';

export interface IncidentNotificationMetadata {
  type: IncidentMetadataType;
  incidentId: string;
  siteId: string;
  siteName: string;
  detectionCount?: number; // END / MERGE_END
  durationMinutes?: number; // END / MERGE_END
  aggregatedDetectionCount?: number; // MERGE_END
  aggregatedDurationMinutes?: number; // MERGE_END
  mergedIncidentCount?: number; // MERGE_START / MERGE_END
  mergedParentIncidentCount?: number; // MERGE_START / MERGE_END
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

export interface IncidentNotificationCreationStats {
  totalNotificationsCreated: number;
  totalIncidentsProcessed: number;
  batchesProcessed: number;
  skippedStopAlerts: number;
  skippedSingleAlertEnd: number;
  skippedParentEnd: number;
  createdMergeStart: number;
  createdMergeEnd: number;
}
