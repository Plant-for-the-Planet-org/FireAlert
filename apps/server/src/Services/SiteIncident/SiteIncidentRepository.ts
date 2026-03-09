import {
  NotificationStatus,
  type Prisma,
  type PrismaClient,
  type SiteIncident,
} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type CreateIncidentData,
  type UpdateIncidentData,
  type ResolveResult,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';
import {isSiteIncidentMethod} from '../Notifications/NotificationRoutingConfig';

type SiteIncidentDistanceRow = SiteIncident & {distanceKm: unknown};

type LockedSiteAlertRow = {
  id: string;
  siteId: string;
  siteIncidentId: string | null;
};

type DescendantIncident = {
  id: string;
  latestSiteAlertId: string;
  mergedIncidentId: string | null;
  isActive: boolean;
};

export type SiteIncidentWithDistance = SiteIncident & {
  distanceKm: number;
};

export type AlertProcessingResult = {
  incident: SiteIncident;
  mergeEventCreated: boolean;
  newMergedIncidentCreated: boolean;
  absorbedIncidentCount: number;
};

/**
 * Repository for SiteIncident data access operations
 * Handles all database interactions for incident management
 */
export class SiteIncidentRepository {
  constructor(public readonly prisma: PrismaClient) {}

  /**
   * Finds an active SiteIncident for a given site
   * @param siteId - The site ID to search for
   * @returns Active incident or null if none exists
   */
  async findActiveBySiteId(siteId: string): Promise<SiteIncident | null> {
    this.validateSiteId(siteId);

    try {
      const incident = await this.prisma.siteIncident.findFirst({
        where: {
          siteId,
          isActive: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
      return incident;
    } catch (error) {
      logger(
        `Error finding active incident for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds the nearest active SiteIncident for a site within a proximity radius.
   * Distance is measured from the incoming alert point to each incident's latest alert point.
   * Ordering is nearest first, then most recently updated.
   */
  async findNearestActiveBySiteAndProximity(
    siteId: string,
    latitude: number,
    longitude: number,
    proximityKm: number,
  ): Promise<SiteIncident | null> {
    const nearbyIncidents = await this.findActiveIncidentsWithinProximity(
      siteId,
      latitude,
      longitude,
      proximityKm,
    );

    const nearestIncident = nearbyIncidents[0];
    if (!nearestIncident) {
      return null;
    }

    const {distanceKm, ...incident} = nearestIncident;
    void distanceKm;
    return incident;
  }

  /**
   * Finds all active SiteIncidents for a site within a proximity radius.
   * Ordered by distance ASC, updatedAt DESC, startedAt ASC, id ASC.
   */
  async findActiveIncidentsWithinProximity(
    siteId: string,
    latitude: number,
    longitude: number,
    proximityKm: number,
  ): Promise<SiteIncidentWithDistance[]> {
    this.validateSiteId(siteId);
    this.validateLatitude(latitude);
    this.validateLongitude(longitude);
    this.validateProximityKm(proximityKm);

    const proximityMeters = proximityKm * 1000;

    try {
      const incidents = await this.prisma.$queryRaw<SiteIncidentDistanceRow[]>`
        SELECT
          si.*,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(sa.longitude, sa.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000.0 AS "distanceKm"
        FROM "SiteIncident" si
        INNER JOIN "SiteAlert" sa ON sa.id = si."latestSiteAlertId"
        WHERE si."siteId" = ${siteId}
          AND si."isActive" = true
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(sa.longitude, sa.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${proximityMeters}
          )
        ORDER BY
          "distanceKm" ASC,
          si."updatedAt" DESC,
          si."startedAt" ASC,
          si.id ASC
      `;

      return incidents.map(incident => ({
        ...incident,
        distanceKm: Number(incident.distanceKm),
      }));
    } catch (error) {
      logger(
        `Error finding active incidents within proximity for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds all active incidents for a given site
   * @param siteId - Site ID
   * @returns Array of active incidents ordered by newest first
   */
  async findActiveIncidentsBySiteId(siteId: string): Promise<SiteIncident[]> {
    this.validateSiteId(siteId);

    try {
      return await this.prisma.siteIncident.findMany({
        where: {
          siteId,
          isActive: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    } catch (error) {
      logger(
        `Error finding active incidents for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds the root incident id for a lineage chain by following mergedIncidentId pointers.
   */
  async findRootIncidentId(incidentId: string): Promise<string> {
    if (
      !incidentId ||
      typeof incidentId !== 'string' ||
      incidentId.trim().length === 0
    ) {
      const error = new Error('Invalid incidentId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      let currentId = incidentId;
      const visited = new Set<string>();

      for (let depth = 0; depth < 50; depth++) {
        if (visited.has(currentId)) {
          logger(
            `Detected lineage cycle while finding root for incident ${incidentId}; returning current node ${currentId}`,
            'warn',
          );
          return currentId;
        }

        visited.add(currentId);

        const incident = await this.prisma.siteIncident.findUnique({
          where: {id: currentId},
          select: {id: true, mergedIncidentId: true},
        });

        if (!incident) {
          logger(
            `Incident ${currentId} missing while finding root for ${incidentId}; returning original`,
            'warn',
          );
          return incidentId;
        }

        if (!incident.mergedIncidentId) {
          return incident.id;
        }

        currentId = incident.mergedIncidentId;
      }

      logger(
        `Exceeded max lineage traversal depth while finding root for incident ${incidentId}; returning current node ${currentId}`,
        'warn',
      );
      return currentId;
    } catch (error) {
      logger(
        `Error finding root incident for ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Creates a new SiteIncident
   * @param data - Incident creation data
   * @returns Created incident
   */
  async createIncident(data: CreateIncidentData): Promise<SiteIncident> {
    // Validate input
    if (!data) {
      const error = new Error('Invalid data: CreateIncidentData is required');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    this.validateSiteId(data.siteId);

    if (!data.startSiteAlertId || typeof data.startSiteAlertId !== 'string') {
      const error = new Error(
        'Invalid data: startSiteAlertId must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.latestSiteAlertId || typeof data.latestSiteAlertId !== 'string') {
      const error = new Error(
        'Invalid data: latestSiteAlertId must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.startedAt || !(data.startedAt instanceof Date)) {
      const error = new Error('Invalid data: startedAt must be a valid Date');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.create({
        data: {
          siteId: data.siteId,
          startSiteAlertId: data.startSiteAlertId,
          latestSiteAlertId: data.latestSiteAlertId,
          startedAt: data.startedAt,
          isMergedIncident: data.isMergedIncident ?? false,
          isActive: true,
          isProcessed: data.isProcessed ?? false,
          reviewStatus: 'to_review',
          siteAlerts: {
            connect: {
              id: data.startSiteAlertId,
            },
          },
        },
      });

      logger(
        `Created new SiteIncident ${incident.id} for site ${data.siteId}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error creating incident for site ${data.siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Creates a non-merged incident from an alert with alert-row locking for idempotency.
   */
  async createIncidentFromAlertWithLock(
    siteId: string,
    alertId: string,
  ): Promise<AlertProcessingResult> {
    this.validateSiteId(siteId);
    this.validateAlertId(alertId);

    try {
      return await this.prisma.$transaction(async tx => {
        const lockedAlert = await this.lockAlertForUpdateTx(tx, alertId);

        if (lockedAlert.siteIncidentId) {
          const existingIncident = await this.getIncidentOrThrowTx(
            tx,
            lockedAlert.siteIncidentId,
          );
          return {
            incident: existingIncident,
            mergeEventCreated: false,
            newMergedIncidentCreated: false,
            absorbedIncidentCount: 0,
          };
        }

        if (lockedAlert.siteId !== siteId) {
          logger(
            `Alert ${alertId} belongs to site ${lockedAlert.siteId}, expected ${siteId}. Proceeding with alert site context.`,
            'warn',
          );
        }

        const incident = await tx.siteIncident.create({
          data: {
            siteId: lockedAlert.siteId,
            startSiteAlertId: alertId,
            latestSiteAlertId: alertId,
            startedAt: new Date(),
            isMergedIncident: false,
            isActive: true,
            isProcessed: false,
            reviewStatus: 'to_review',
            siteAlerts: {
              connect: {
                id: alertId,
              },
            },
          },
        });

        return {
          incident,
          mergeEventCreated: false,
          newMergedIncidentCreated: false,
          absorbedIncidentCount: 0,
        };
      });
    } catch (error) {
      logger(
        `Error creating incident from alert ${alertId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Updates an existing SiteIncident
   * @param id - Incident ID
   * @param data - Update data
   * @returns Updated incident
   */
  async updateIncident(
    id: string,
    data: UpdateIncidentData,
  ): Promise<SiteIncident> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new Error('Invalid id: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data || typeof data !== 'object') {
      const error = new Error('Invalid data: UpdateIncidentData is required');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.update({
        where: {id},
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger(
        `Updated SiteIncident ${id} with fields: ${Object.keys(data).join(
          ', ',
        )}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error updating incident ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds inactive root incidents that should be resolved.
   * Descendants are resolved as part of root closure.
   */
  async findInactiveIncidents(inactiveHours: number): Promise<SiteIncident[]> {
    if (typeof inactiveHours !== 'number' || inactiveHours <= 0) {
      const error = new Error(
        'Invalid inactiveHours: must be a positive number',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const cutoffTime = new Date(Date.now() - inactiveHours * 60 * 60 * 1000);

      const incidents = await this.prisma.siteIncident.findMany({
        where: {
          isActive: true,
          mergedIncidentId: null,
          updatedAt: {
            lt: cutoffTime,
          },
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      logger(
        `Found ${incidents.length} inactive root incidents (>${inactiveHours}h)`,
        'debug',
      );

      return incidents;
    } catch (error) {
      logger(
        `Error finding inactive incidents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Resolves a batch of incidents.
   * Root incidents trigger recursive descendant closure in the same transaction.
   */
  async resolveIncidentsBatch(
    incidents: SiteIncident[],
  ): Promise<ResolveResult> {
    if (!Array.isArray(incidents) || incidents.length === 0) {
      const error = new Error('Invalid incidents: must be a non-empty array');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    const metrics: IncidentMetrics = {
      totalDurationMs: 0,
      operationCount: incidents.length,
      batchSize: incidents.length,
    };

    const startTime = Date.now();
    const errors: Array<{incidentId: string; error: Error}> = [];
    let resolvedCount = 0;
    let descendantClosedCount = 0;

    try {
      for (const incident of incidents) {
        try {
          const updateStart = Date.now();

          const result = await this.prisma.$transaction(async tx =>
            this.closeRootIncidentAndDescendantsTx(tx, incident.id),
          );

          if (result.rootClosed) {
            resolvedCount++;
            descendantClosedCount += result.descendantClosedCount;
          }

          metrics.resolutionDurationMs =
            (metrics.resolutionDurationMs || 0) + (Date.now() - updateStart);

          logger(
            `Resolved root SiteIncident ${incident.id} with ${result.descendantClosedCount} descendant closures`,
            'debug',
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({incidentId: incident.id, error: err});
          logger(
            `Error resolving incident ${incident.id}: ${err.message}`,
            'warn',
          );
        }
      }

      metrics.totalDurationMs = Date.now() - startTime;

      logger(
        `Batch resolution complete: ${resolvedCount}/${incidents.length} roots resolved in ${metrics.totalDurationMs}ms with ${descendantClosedCount} descendant closures`,
        'debug',
      );

      return {
        resolvedCount,
        descendantClosedCount,
        errors,
        metrics,
      };
    } catch (error) {
      logger(
        `Error in batch resolution: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Associates a SiteAlert with an incident by updating latestSiteAlertId
   * @param incidentId - Incident ID
   * @param alertId - Alert ID to associate
   * @returns Updated incident
   */
  async associateAlert(
    incidentId: string,
    alertId: string,
  ): Promise<SiteIncident> {
    if (
      !incidentId ||
      typeof incidentId !== 'string' ||
      incidentId.trim().length === 0
    ) {
      const error = new Error('Invalid incidentId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    this.validateAlertId(alertId);

    try {
      const incident = await this.prisma.siteIncident.update({
        where: {id: incidentId},
        data: {
          latestSiteAlertId: alertId,
          updatedAt: new Date(),
          siteAlerts: {
            connect: {
              id: alertId,
            },
          },
        },
      });

      logger(
        `Associated alert ${alertId} with incident ${incidentId}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error associating alert ${alertId} with incident ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Associates an alert to an incident and updates merged ancestors to keep lineage active.
   */
  async associateAlertAndTouchAncestors(
    incidentId: string,
    alertId: string,
  ): Promise<AlertProcessingResult> {
    if (
      !incidentId ||
      typeof incidentId !== 'string' ||
      incidentId.trim().length === 0
    ) {
      const error = new Error('Invalid incidentId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    this.validateAlertId(alertId);

    try {
      return await this.prisma.$transaction(async tx => {
        const lockedAlert = await this.lockAlertForUpdateTx(tx, alertId);

        if (lockedAlert.siteIncidentId) {
          const existingIncident = await this.getIncidentOrThrowTx(
            tx,
            lockedAlert.siteIncidentId,
          );
          return {
            incident: existingIncident,
            mergeEventCreated: false,
            newMergedIncidentCreated: false,
            absorbedIncidentCount: 0,
          };
        }

        const incident = await tx.siteIncident.update({
          where: {id: incidentId},
          data: {
            latestSiteAlertId: alertId,
            updatedAt: new Date(),
            siteAlerts: {
              connect: {
                id: alertId,
              },
            },
          },
        });

        if (incident.mergedIncidentId) {
          await this.touchAncestorChainTx(tx, incident.mergedIncidentId);
        }

        return {
          incident,
          mergeEventCreated: false,
          newMergedIncidentCreated: false,
          absorbedIncidentCount: 0,
        };
      });
    } catch (error) {
      logger(
        `Error associating alert ${alertId} and touching ancestors for incident ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Keeps an existing merged incident as target and absorbs representatives into it.
   */
  async absorbIntoExistingMergedAndAssociate(
    mergedIncidentId: string,
    representativeIncidentIds: string[],
    alertId: string,
  ): Promise<AlertProcessingResult> {
    if (
      !mergedIncidentId ||
      typeof mergedIncidentId !== 'string' ||
      mergedIncidentId.trim().length === 0
    ) {
      const error = new Error(
        'Invalid mergedIncidentId: must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    this.validateAlertId(alertId);

    try {
      return await this.prisma.$transaction(async tx => {
        const lockedAlert = await this.lockAlertForUpdateTx(tx, alertId);

        if (lockedAlert.siteIncidentId) {
          const existingIncident = await this.getIncidentOrThrowTx(
            tx,
            lockedAlert.siteIncidentId,
          );
          return {
            incident: existingIncident,
            mergeEventCreated: false,
            newMergedIncidentCreated: false,
            absorbedIncidentCount: 0,
          };
        }

        const targetIncident = await this.getIncidentOrThrowTx(tx, mergedIncidentId);

        const absorbedRepresentativeIds = Array.from(
          new Set(representativeIncidentIds),
        ).filter(id => id !== mergedIncidentId);
        let absorbedIncidentCount = 0;

        if (absorbedRepresentativeIds.length > 0) {
          const now = new Date();
          const absorptionResult = await tx.siteIncident.updateMany({
            where: {
              id: {in: absorbedRepresentativeIds},
              isActive: true,
              mergedIncidentId: {
                not: mergedIncidentId,
              },
            },
            data: {
              mergedIncidentId,
              mergedAt: now,
              updatedAt: now,
            },
          });
          absorbedIncidentCount = absorptionResult.count;

          if (absorptionResult.count > 0) {
            await this.createMergeNotificationsTx(
              tx,
              targetIncident.siteId,
              mergedIncidentId,
              alertId,
              absorptionResult.count,
            );
          }
        }

        const incident = await tx.siteIncident.update({
          where: {id: mergedIncidentId},
          data: {
            latestSiteAlertId: alertId,
            updatedAt: new Date(),
            siteAlerts: {
              connect: {
                id: alertId,
              },
            },
          },
        });

        return {
          incident,
          mergeEventCreated: absorbedIncidentCount > 0,
          newMergedIncidentCreated: false,
          absorbedIncidentCount,
        };
      });
    } catch (error) {
      logger(
        `Error absorbing representatives into merged incident ${mergedIncidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Creates a new merged incident from representatives and associates the alert to it.
   */
  async createMergedIncidentFromRepresentativesAndAssociate(
    siteId: string,
    representativeIncidentIds: string[],
    alertId: string,
  ): Promise<AlertProcessingResult> {
    this.validateSiteId(siteId);
    this.validateAlertId(alertId);

    try {
      return await this.prisma.$transaction(async tx => {
        const lockedAlert = await this.lockAlertForUpdateTx(tx, alertId);

        if (lockedAlert.siteIncidentId) {
          const existingIncident = await this.getIncidentOrThrowTx(
            tx,
            lockedAlert.siteIncidentId,
          );
          return {
            incident: existingIncident,
            mergeEventCreated: false,
            newMergedIncidentCreated: false,
            absorbedIncidentCount: 0,
          };
        }

        const representativeIds = Array.from(new Set(representativeIncidentIds));
        if (representativeIds.length < 2) {
          const fallbackIncident = await tx.siteIncident.create({
            data: {
              siteId: lockedAlert.siteId,
              startSiteAlertId: alertId,
              latestSiteAlertId: alertId,
              startedAt: new Date(),
              isMergedIncident: false,
              isActive: true,
              isProcessed: false,
              reviewStatus: 'to_review',
              siteAlerts: {
                connect: {
                  id: alertId,
                },
              },
            },
          });

          return {
            incident: fallbackIncident,
            mergeEventCreated: false,
            newMergedIncidentCreated: false,
            absorbedIncidentCount: 0,
          };
        }

        const mergedIncident = await tx.siteIncident.create({
          data: {
            siteId: lockedAlert.siteId,
            startSiteAlertId: alertId,
            latestSiteAlertId: alertId,
            startedAt: new Date(),
            isMergedIncident: true,
            isActive: true,
            // Merged incidents use MERGE_SCHEDULED notifications instead of START_SCHEDULED.
            isProcessed: true,
            reviewStatus: 'to_review',
            siteAlerts: {
              connect: {
                id: alertId,
              },
            },
          },
        });

        const now = new Date();
        const absorbedRepresentativeIds = representativeIds.filter(
          id => id !== mergedIncident.id,
        );
        let absorbedIncidentCount = 0;

        if (absorbedRepresentativeIds.length > 0) {
          const absorptionResult = await tx.siteIncident.updateMany({
            where: {
              id: {in: absorbedRepresentativeIds},
              isActive: true,
            },
            data: {
              mergedIncidentId: mergedIncident.id,
              mergedAt: now,
              updatedAt: now,
            },
          });
          absorbedIncidentCount = absorptionResult.count;

          if (absorptionResult.count > 0) {
            await this.createMergeNotificationsTx(
              tx,
              mergedIncident.siteId,
              mergedIncident.id,
              alertId,
              absorptionResult.count,
            );
          }
        }

        return {
          incident: mergedIncident,
          mergeEventCreated: absorbedIncidentCount > 0,
          newMergedIncidentCreated: true,
          absorbedIncidentCount,
        };
      });
    } catch (error) {
      logger(
        `Error creating merged incident from representatives for alert ${alertId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets incident by ID
   * @param id - Incident ID
   * @returns Incident or null
   */
  async getIncidentById(id: string): Promise<SiteIncident | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new Error('Invalid id: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return await this.prisma.siteIncident.findUnique({
        where: {id},
      });
    } catch (error) {
      logger(
        `Error getting incident ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Counts active incidents for a site
   * @param siteId - Site ID
   * @returns Count of active incidents
   */
  async countActiveBysite(siteId: string): Promise<number> {
    this.validateSiteId(siteId);

    try {
      return await this.prisma.siteIncident.count({
        where: {
          siteId,
          isActive: true,
        },
      });
    } catch (error) {
      logger(
        `Error counting active incidents for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  private async getIncidentOrThrowTx(
    tx: Prisma.TransactionClient,
    incidentId: string,
  ): Promise<SiteIncident> {
    const incident = await tx.siteIncident.findUnique({
      where: {id: incidentId},
    });

    if (!incident) {
      throw new Error(`SiteIncident ${incidentId} not found`);
    }

    return incident;
  }

  private async lockAlertForUpdateTx(
    tx: Prisma.TransactionClient,
    alertId: string,
  ): Promise<LockedSiteAlertRow> {
    const rows = await tx.$queryRaw<LockedSiteAlertRow[]>`
      SELECT id, "siteId", "siteIncidentId"
      FROM "SiteAlert"
      WHERE id = ${alertId}
      FOR UPDATE
    `;

    const lockedAlert = rows[0];
    if (!lockedAlert) {
      throw new Error(`SiteAlert ${alertId} not found`);
    }

    return lockedAlert;
  }

  private async touchAncestorChainTx(
    tx: Prisma.TransactionClient,
    parentIncidentId: string,
  ): Promise<void> {
    let currentId: string | null = parentIncidentId;
    const visited = new Set<string>();
    const touchTime = new Date();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const incident: {id: string; mergedIncidentId: string | null} | null =
        await tx.siteIncident.findUnique({
          where: {id: currentId},
          select: {id: true, mergedIncidentId: true},
        });

      if (!incident) {
        logger(
          `Skipping missing ancestor incident ${currentId} while touching ancestry`,
          'warn',
        );
        break;
      }

      await tx.siteIncident.update({
        where: {id: incident.id},
        data: {
          updatedAt: touchTime,
        },
      });

      currentId = incident.mergedIncidentId;
    }
  }

  private async getDescendantIncidentsTx(
    tx: Prisma.TransactionClient,
    rootIncidentId: string,
  ): Promise<DescendantIncident[]> {
    const descendants: DescendantIncident[] = [];
    const visited = new Set<string>([rootIncidentId]);
    let frontier: string[] = [rootIncidentId];

    while (frontier.length > 0) {
      const childIncidents = await tx.siteIncident.findMany({
        where: {
          mergedIncidentId: {
            in: frontier,
          },
        },
        select: {
          id: true,
          latestSiteAlertId: true,
          mergedIncidentId: true,
          isActive: true,
        },
      });

      frontier = [];

      for (const childIncident of childIncidents) {
        if (visited.has(childIncident.id)) {
          continue;
        }

        visited.add(childIncident.id);
        descendants.push(childIncident);
        frontier.push(childIncident.id);
      }
    }

    return descendants;
  }

  private async closeRootIncidentAndDescendantsTx(
    tx: Prisma.TransactionClient,
    rootIncidentId: string,
  ): Promise<{rootClosed: boolean; descendantClosedCount: number}> {
    const rootIncident = await tx.siteIncident.findUnique({
      where: {id: rootIncidentId},
      select: {
        id: true,
        isActive: true,
        latestSiteAlertId: true,
        mergedIncidentId: true,
      },
    });

    if (!rootIncident || !rootIncident.isActive) {
      return {
        rootClosed: false,
        descendantClosedCount: 0,
      };
    }

    if (rootIncident.mergedIncidentId) {
      // Descendants are closed by their root incident closure.
      return {
        rootClosed: false,
        descendantClosedCount: 0,
      };
    }

    const resolvedAt = new Date();

    await tx.siteIncident.update({
      where: {id: rootIncident.id},
      data: {
        isActive: false,
        isProcessed: false,
        endedAt: resolvedAt,
        endSiteAlertId: rootIncident.latestSiteAlertId,
        updatedAt: resolvedAt,
      },
    });

    const descendants = await this.getDescendantIncidentsTx(tx, rootIncident.id);
    const activeDescendants = descendants.filter(descendant => descendant.isActive);

    for (const descendantIncident of activeDescendants) {
      await tx.siteIncident.update({
        where: {id: descendantIncident.id},
        data: {
          isActive: false,
          isProcessed: true,
          endedAt: resolvedAt,
          endSiteAlertId: descendantIncident.latestSiteAlertId,
          updatedAt: resolvedAt,
        },
      });
    }

    return {
      rootClosed: true,
      descendantClosedCount: activeDescendants.length,
    };
  }

  private async createMergeNotificationsTx(
    tx: Prisma.TransactionClient,
    siteId: string,
    mergedIncidentId: string,
    triggerAlertId: string,
    mergeSourceCount: number,
  ): Promise<number> {
    const siteWithUsers = await tx.site.findUnique({
      where: {id: siteId},
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
    });

    if (!siteWithUsers) {
      logger(
        `Skipping merge notification creation. Site ${siteId} not found.`,
        'warn',
      );
      return 0;
    }

    const allAlertMethods = [
      ...(siteWithUsers.user?.alertMethods ?? []),
      ...siteWithUsers.siteRelations.flatMap(relation =>
        relation.user?.alertMethods ? relation.user.alertMethods : [],
      ),
    ];

    const validMethods = allAlertMethods.filter(
      method =>
        method.isEnabled &&
        method.isVerified &&
        isSiteIncidentMethod(method.method),
    );

    const deduplicatedMethods = new Map<string, {method: string; destination: string}>();
    for (const method of validMethods) {
      const key = `${method.method}:${method.destination}`;
      if (!deduplicatedMethods.has(key)) {
        deduplicatedMethods.set(key, {
          method: method.method,
          destination: method.destination,
        });
      }
    }

    const siteName = siteWithUsers.name || 'Unnamed Site';

    const notificationRows = Array.from(deduplicatedMethods.values()).map(
      method => ({
        siteAlertId: triggerAlertId,
        alertMethod: method.method,
        destination: method.destination,
        isDelivered: false,
        isSkipped: false,
        notificationStatus: NotificationStatus.MERGE_SCHEDULED,
        metadata: {
          type: 'INCIDENT_MERGE',
          incidentId: mergedIncidentId,
          siteId,
          siteName,
          mergeSourceCount,
        } as Prisma.InputJsonValue,
      }),
    );

    if (notificationRows.length === 0) {
      logger(
        `No merge notifications created for incident ${mergedIncidentId}; no eligible incident methods`,
        'debug',
      );
      return 0;
    }

    await tx.notification.createMany({
      data: notificationRows,
    });

    return notificationRows.length;
  }

  private validateSiteId(siteId: string): void {
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  private validateAlertId(alertId: string): void {
    if (!alertId || typeof alertId !== 'string' || alertId.trim().length === 0) {
      const error = new Error('Invalid alertId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  private validateLatitude(latitude: number): void {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      const error = new Error('Invalid latitude: must be between -90 and 90');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  private validateLongitude(longitude: number): void {
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      const error = new Error(
        'Invalid longitude: must be between -180 and 180',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  private validateProximityKm(proximityKm: number): void {
    if (!Number.isFinite(proximityKm) || proximityKm <= 0) {
      const error = new Error(
        'Invalid proximityKm: must be a positive number',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }
  }
}
