import {
  SiteIncidentReviewStatus,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

export type IncidentNotificationKind = 'START' | 'END';

export type IncidentNotificationEligibilityReason =
  | 'ELIGIBLE'
  | 'STOP_ALERTS'
  | 'SINGLE_ALERT_END'
  | 'PARENT_END_SUPPRESSED';

export interface IncidentAggregateSummary {
  detectionCount: number;
  durationMinutes: number;
  mergedIncidentCount: number;
  mergedParentIncidentCount: number;
  incidentIds: string[];
}

export interface IncidentNotificationEligibilityResult {
  eligible: boolean;
  reason: IncidentNotificationEligibilityReason;
  notificationKind: IncidentNotificationKind;
  isMergedChild: boolean;
  isParentWithChild: boolean;
  aggregateSummary?: IncidentAggregateSummary;
}

export type IncidentForEligibility = {
  id: string;
  siteId: string;
  isActive: boolean;
  startedAt: Date;
  endedAt: Date | null;
  updatedAt: Date;
  reviewStatus: SiteIncidentReviewStatus;
  relatedIncidentId: string | null;
  parentIncidents: Array<{id: string}>;
  _count: {siteAlerts: number};
};

const chainIncidentSelect = {
  id: true,
  siteId: true,
  startedAt: true,
  endedAt: true,
  updatedAt: true,
  relatedIncidentId: true,
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
} satisfies Prisma.SiteIncidentSelect;

type ChainIncident = Prisma.SiteIncidentGetPayload<{
  select: typeof chainIncidentSelect;
}>;

export class IncidentNotificationEligibilityService {
  constructor(private readonly prisma: PrismaClient) {}

  async evaluateIncident(
    incident: IncidentForEligibility,
  ): Promise<IncidentNotificationEligibilityResult> {
    const notificationKind: IncidentNotificationKind = incident.isActive
      ? 'START'
      : 'END';
    const isMergedChild = incident.parentIncidents.length > 0;
    const isParentWithChild = Boolean(incident.relatedIncidentId);

    if (incident.reviewStatus === SiteIncidentReviewStatus.STOP_ALERTS) {
      return {
        eligible: false,
        reason: 'STOP_ALERTS',
        notificationKind,
        isMergedChild,
        isParentWithChild,
      };
    }

    if (notificationKind === 'END') {
      if (isParentWithChild) {
        return {
          eligible: false,
          reason: 'PARENT_END_SUPPRESSED',
          notificationKind,
          isMergedChild,
          isParentWithChild,
        };
      }

      if (incident._count.siteAlerts <= 1) {
        return {
          eligible: false,
          reason: 'SINGLE_ALERT_END',
          notificationKind,
          isMergedChild,
          isParentWithChild,
        };
      }
    }

    const result: IncidentNotificationEligibilityResult = {
      eligible: true,
      reason: 'ELIGIBLE',
      notificationKind,
      isMergedChild,
      isParentWithChild,
    };

    if (notificationKind === 'END' && isMergedChild) {
      result.aggregateSummary = await this.buildAggregateSummary(
        incident.siteId,
        incident.id,
      );
    }

    return result;
  }

  private async buildAggregateSummary(
    siteId: string,
    rootIncidentId: string,
  ): Promise<IncidentAggregateSummary> {
    const incidents = await this.getRelatedComponentIncidents(siteId, rootIncidentId);

    let earliestStart = new Date(8640000000000000);
    let latestEnd = new Date(-8640000000000000);
    let detectionCount = 0;

    for (const incident of incidents) {
      detectionCount += incident._count.siteAlerts;

      if (incident.startedAt < earliestStart) {
        earliestStart = incident.startedAt;
      }

      const incidentEnd = incident.endedAt || incident.updatedAt;
      if (incidentEnd > latestEnd) {
        latestEnd = incidentEnd;
      }
    }

    const durationMinutes = Math.max(
      0,
      Math.round((latestEnd.getTime() - earliestStart.getTime()) / 60000),
    );

    return {
      detectionCount,
      durationMinutes,
      mergedIncidentCount: incidents.length,
      mergedParentIncidentCount: Math.max(incidents.length - 1, 0),
      incidentIds: incidents.map(incident => incident.id),
    };
  }

  private async getRelatedComponentIncidents(
    siteId: string,
    startIncidentId: string,
  ): Promise<ChainIncident[]> {
    const queue: string[] = [startIncidentId];
    const visited = new Set<string>();
    const component = new Map<string, ChainIncident>();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const incident = await this.prisma.siteIncident.findUnique({
        where: {
          id: currentId,
        },
        select: chainIncidentSelect,
      });

      if (!incident || incident.siteId !== siteId) {
        continue;
      }

      component.set(incident.id, incident);

      if (incident.relatedIncidentId && !visited.has(incident.relatedIncidentId)) {
        queue.push(incident.relatedIncidentId);
      }

      for (const parent of incident.parentIncidents) {
        if (!visited.has(parent.id)) {
          queue.push(parent.id);
        }
      }
    }

    const componentIncidents = Array.from(component.values());

    return componentIncidents.length > 0
      ? componentIncidents
      : [
          {
            id: startIncidentId,
            siteId,
            startedAt: new Date(),
            endedAt: null,
            updatedAt: new Date(),
            relatedIncidentId: null,
            parentIncidents: [],
            _count: {siteAlerts: 0},
          },
        ];
  }
}
