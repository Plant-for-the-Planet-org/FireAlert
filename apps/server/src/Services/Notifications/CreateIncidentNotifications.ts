import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {
  type NotificationQueueItem,
  type IncidentNotificationMetadata,
  type IncidentNotificationCreationStats,
} from '../../Interfaces/SiteIncidentNotifications';
import {
  NotificationStatus,
  type Prisma,
  type SiteIncident,
} from '@prisma/client';
import {isSiteIncidentMethod} from './NotificationRoutingConfig';
import {
  IncidentNotificationEligibilityService,
} from './IncidentNotificationEligibilityService';

type AlertMethodInfo = {
  method: string;
  destination: string;
  isVerified: boolean;
  isEnabled: boolean;
};

const incidentNotificationInclude = {
  parentIncidents: {
    select: {
      id: true,
    },
  },
  _count: {
    select: {
      siteAlerts: true,
    },
  },
  site: {
    include: {
      user: {
        include: {
          alertMethods: true,
        },
      },
      siteRelations: {
        include: {
          user: {
            include: {
              alertMethods: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SiteIncidentInclude;

type IncidentWithNotificationRelations = Prisma.SiteIncidentGetPayload<{
  include: typeof incidentNotificationInclude;
}>;

type QueueBuildResult = {
  queue: NotificationQueueItem[];
  skippedStopAlerts: number;
  skippedSingleAlertEnd: number;
  skippedParentEnd: number;
  createdMergeStart: number;
  createdMergeEnd: number;
};

export class CreateIncidentNotifications {
  private readonly eligibilityService = new IncidentNotificationEligibilityService(
    prisma,
  );

  static async run(): Promise<IncidentNotificationCreationStats> {
    const instance = new CreateIncidentNotifications();
    return await instance.process();
  }

  async process(): Promise<IncidentNotificationCreationStats> {
    const BATCH_SIZE = 50;
    let batchNumber = 0;

    const stats: IncidentNotificationCreationStats = {
      totalNotificationsCreated: 0,
      totalIncidentsProcessed: 0,
      batchesProcessed: 0,
      skippedStopAlerts: 0,
      skippedSingleAlertEnd: 0,
      skippedParentEnd: 0,
      createdMergeStart: 0,
      createdMergeEnd: 0,
    };

    while (true) {
      const incidents = await this.processUnprocessedIncidents(BATCH_SIZE);
      if (incidents.length === 0) {
        break;
      }

      batchNumber++;
      stats.totalIncidentsProcessed += incidents.length;

      const queueBuildResult = await this.createNotificationQueue(incidents);
      stats.skippedStopAlerts += queueBuildResult.skippedStopAlerts;
      stats.skippedSingleAlertEnd += queueBuildResult.skippedSingleAlertEnd;
      stats.skippedParentEnd += queueBuildResult.skippedParentEnd;
      stats.createdMergeStart += queueBuildResult.createdMergeStart;
      stats.createdMergeEnd += queueBuildResult.createdMergeEnd;

      const processedIncidentIds = incidents.map(incident => incident.id);

      if (queueBuildResult.queue.length === 0) {
        await this.markIncidentsAsProcessed(processedIncidentIds);
        continue;
      }

      await this.executeTransaction(queueBuildResult.queue, processedIncidentIds);
      stats.totalNotificationsCreated += queueBuildResult.queue.length;
    }

    stats.batchesProcessed = batchNumber;

    logger(
      `CreateIncidentNotifications: Processed ${stats.totalIncidentsProcessed} incidents in ${stats.batchesProcessed} batches, created ${stats.totalNotificationsCreated} incident notifications (mergeStart=${stats.createdMergeStart}, mergeEnd=${stats.createdMergeEnd}, skippedStopAlerts=${stats.skippedStopAlerts}, skippedSingleAlertEnd=${stats.skippedSingleAlertEnd}, skippedParentEnd=${stats.skippedParentEnd})`,
      'info',
    );

    return stats;
  }

  private async processUnprocessedIncidents(
    batchSize: number,
  ): Promise<IncidentWithNotificationRelations[]> {
    const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000);

    return await prisma.siteIncident.findMany({
      where: {
        isProcessed: false,
        updatedAt: {
          gte: SIX_HOURS_AGO,
        },
      },
      include: incidentNotificationInclude,
      take: batchSize,
    });
  }

  private async createNotificationQueue(
    incidents: IncidentWithNotificationRelations[],
  ): Promise<QueueBuildResult> {
    const queue: NotificationQueueItem[] = [];
    const result: QueueBuildResult = {
      queue,
      skippedStopAlerts: 0,
      skippedSingleAlertEnd: 0,
      skippedParentEnd: 0,
      createdMergeStart: 0,
      createdMergeEnd: 0,
    };

    for (const incident of incidents) {
      const validMethods = this.getValidIncidentMethods(incident);
      if (validMethods.length === 0) {
        continue;
      }

      const eligibility =
        await this.eligibilityService.evaluateIncident(incident);

      if (!eligibility.eligible) {
        if (eligibility.reason === 'STOP_ALERTS') {
          result.skippedStopAlerts++;
        } else if (eligibility.reason === 'SINGLE_ALERT_END') {
          result.skippedSingleAlertEnd++;
        } else if (eligibility.reason === 'PARENT_END_SUPPRESSED') {
          result.skippedParentEnd++;
        }
        continue;
      }

      const isStart = eligibility.notificationKind === 'START';
      const isMerged = eligibility.isMergedChild;
      const notificationStatus = this.getScheduledStatus(isStart, isMerged);
      const metadataType = this.getMetadataType(isStart, isMerged);
      const targetSiteAlertId = isStart
        ? incident.startSiteAlertId
        : incident.endSiteAlertId || incident.latestSiteAlertId;

      const metadata: IncidentNotificationMetadata = {
        type: metadataType,
        incidentId: incident.id,
        siteId: incident.site.id,
        siteName: incident.site.name || 'Unnamed Site',
      };

      if (!isStart) {
        if (isMerged && eligibility.aggregateSummary) {
          metadata.detectionCount = eligibility.aggregateSummary.detectionCount;
          metadata.durationMinutes = eligibility.aggregateSummary.durationMinutes;
          metadata.aggregatedDetectionCount =
            eligibility.aggregateSummary.detectionCount;
          metadata.aggregatedDurationMinutes =
            eligibility.aggregateSummary.durationMinutes;
          metadata.mergedIncidentCount =
            eligibility.aggregateSummary.mergedIncidentCount;
          metadata.mergedParentIncidentCount =
            eligibility.aggregateSummary.mergedParentIncidentCount;
        } else {
          metadata.detectionCount = incident._count.siteAlerts;
          if (incident.endedAt) {
            metadata.durationMinutes = Math.round(
              (new Date(incident.endedAt).getTime() -
                new Date(incident.startedAt).getTime()) /
                60000,
            );
          }
        }
      } else if (isMerged) {
        metadata.mergedParentIncidentCount = incident.parentIncidents.length;
        metadata.mergedIncidentCount = incident.parentIncidents.length + 1;
      }

      for (const method of validMethods) {
        queue.push({
          siteIncidentId: incident.id,
          siteAlertId: targetSiteAlertId,
          siteId: incident.site.id,
          alertMethod: method.method,
          destination: method.destination,
          notificationStatus,
          metadata,
        });
      }

      if (isMerged && isStart) {
        result.createdMergeStart += validMethods.length;
      } else if (isMerged && !isStart) {
        result.createdMergeEnd += validMethods.length;
      }
    }

    return result;
  }

  private getValidIncidentMethods(
    incident: IncidentWithNotificationRelations,
  ): AlertMethodInfo[] {
    const site = incident.site;
    const allAlertMethods: AlertMethodInfo[] = [];

    if (site.user?.alertMethods) {
      allAlertMethods.push(...site.user.alertMethods);
    }

    if (site.siteRelations) {
      for (const relation of site.siteRelations) {
        if (relation.user?.alertMethods) {
          allAlertMethods.push(...relation.user.alertMethods);
        }
      }
    }

    return allAlertMethods.filter(
      method =>
        method.isVerified &&
        method.isEnabled &&
        isSiteIncidentMethod(method.method),
    );
  }

  private getScheduledStatus(
    isStart: boolean,
    isMerged: boolean,
  ): NotificationStatus {
    if (isStart && isMerged) {
      return NotificationStatus.MERGE_START_SCHEDULED;
    }
    if (!isStart && isMerged) {
      return NotificationStatus.MERGE_END_SCHEDULED;
    }
    if (isStart) {
      return NotificationStatus.START_SCHEDULED;
    }
    return NotificationStatus.END_SCHEDULED;
  }

  private getMetadataType(
    isStart: boolean,
    isMerged: boolean,
  ): IncidentNotificationMetadata['type'] {
    if (isStart && isMerged) {
      return 'INCIDENT_MERGE_START';
    }
    if (!isStart && isMerged) {
      return 'INCIDENT_MERGE_END';
    }
    if (isStart) {
      return 'INCIDENT_START';
    }
    return 'INCIDENT_END';
  }

  private async markIncidentsAsProcessed(incidentIds: string[]) {
    if (incidentIds.length === 0) return;
    await prisma.siteIncident.updateMany({
      where: {id: {in: incidentIds}},
      data: {isProcessed: true},
    });
  }

  private async executeTransaction(
    queue: NotificationQueueItem[],
    processedIncidentIds: string[],
  ) {
    await prisma.$transaction(async tx => {
      const createdNotifications = await Promise.all(
        queue.map(item =>
          tx.notification.create({
            data: {
              siteAlertId: item.siteAlertId,
              alertMethod: item.alertMethod,
              destination: item.destination,
              isDelivered: false,
              isSkipped: false,
              notificationStatus: item.notificationStatus,
              metadata: this.toInputJsonMetadata(item.metadata),
            },
          }),
        ),
      );

      const incidentNotificationMap = new Map<
        string,
        {start?: string; end?: string}
      >();

      for (const notification of createdNotifications) {
        const meta = notification.metadata as IncidentNotificationMetadata | null;
        if (!meta?.incidentId) continue;

        const existing = incidentNotificationMap.get(meta.incidentId) ?? {};
        if (
          (meta.type === 'INCIDENT_START' ||
            meta.type === 'INCIDENT_MERGE_START') &&
          !existing.start
        ) {
          existing.start = notification.id;
        } else if (
          (meta.type === 'INCIDENT_END' || meta.type === 'INCIDENT_MERGE_END') &&
          !existing.end
        ) {
          existing.end = notification.id;
        }

        incidentNotificationMap.set(meta.incidentId, existing);
      }

      if (processedIncidentIds.length > 0) {
        await tx.siteIncident.updateMany({
          where: {id: {in: processedIncidentIds}},
          data: {isProcessed: true},
        });
      }

      const incidentUpdatePromises: Promise<SiteIncident>[] = [];
      for (const [incidentId, notificationRefs] of Array.from(
        incidentNotificationMap.entries(),
      )) {
        const data: {
          startNotificationId?: string;
          endNotificationId?: string;
        } = {};

        if (notificationRefs.start) {
          data.startNotificationId = notificationRefs.start;
        }

        if (notificationRefs.end) {
          data.endNotificationId = notificationRefs.end;
        }

        if (Object.keys(data).length === 0) continue;

        incidentUpdatePromises.push(
          tx.siteIncident.update({
            where: {id: incidentId},
            data,
          }),
        );
      }

      if (incidentUpdatePromises.length > 0) {
        await Promise.all(incidentUpdatePromises);
      }

      const siteIdsToUpdate = Array.from(new Set(queue.map(item => item.siteId)));
      if (siteIdsToUpdate.length > 0) {
        await tx.site.updateMany({
          where: {id: {in: siteIdsToUpdate}},
          data: {lastMessageCreated: new Date()},
        });
      }
    });
  }

  private toInputJsonMetadata(
    metadata: IncidentNotificationMetadata,
  ): Prisma.InputJsonObject {
    const entries = Object.entries(metadata).filter(
      ([, value]) => value !== undefined,
    );
    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }
}
