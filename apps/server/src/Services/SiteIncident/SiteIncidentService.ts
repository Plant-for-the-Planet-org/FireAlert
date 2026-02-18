import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {TRPCError} from '@trpc/server';
import type {SiteAlert, GeoEvent, SiteIncident} from '@prisma/client';

/**
 * Service for managing SiteIncident lifecycle and operations
 */
export class SiteIncidentService {
  /**
   * Creates a new incident or updates an existing active incident for a site
   *
   * @param siteId - The ID of the site
   * @param siteAlert - The SiteAlert that triggered this incident
   * @param geoEvent - The GeoEvent associated with the alert
   * @returns The created or updated SiteIncident
   * @throws TRPCError if site doesn't exist or validation fails
   */
  async createOrUpdateIncident(
    siteId: string,
    siteAlert: SiteAlert,
    _geoEvent: GeoEvent,
  ): Promise<SiteIncident> {
    try {
      // Verify site exists
      const site = await prisma.site.findUnique({
        where: {id: siteId},
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Site with id ${siteId} not found`,
        });
      }

      // Check for existing active incident
      const activeIncident = await this.getActiveIncidentForSite(siteId);

      if (activeIncident) {
        // Update existing incident
        const updatedIncident = await prisma.siteIncident.update({
          where: {id: activeIncident.id},
          data: {
            latestSiteAlertId: siteAlert.id,
            endSiteAlertId: siteAlert.id,
            updatedAt: new Date(),
          },
        });

        // Associate the alert with the incident
        await prisma.siteAlert.update({
          where: {id: siteAlert.id},
          data: {siteIncidentId: activeIncident.id},
        });

        logger(
          `Updated SiteIncident ${activeIncident.id} with new alert ${siteAlert.id}`,
          'info',
        );

        return updatedIncident;
      } else {
        // Create new incident
        const newIncident = await prisma.siteIncident.create({
          data: {
            siteId,
            startSiteAlertId: siteAlert.id,
            latestSiteAlertId: siteAlert.id,
            endSiteAlertId: siteAlert.id,
            startedAt: new Date(),
            isActive: true,
            isProcessed: false,
            reviewStatus: 'to_review',
          },
        });

        // Associate the alert with the incident
        await prisma.siteAlert.update({
          where: {id: siteAlert.id},
          data: {siteIncidentId: newIncident.id},
        });

        logger(
          `Created new SiteIncident ${newIncident.id} for site ${siteId}`,
          'info',
        );

        return newIncident;
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(
        `Failed to create or update incident for site ${siteId}: ${String(
          error,
        )}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create or update incident',
        cause: error,
      });
    }
  }

  /**
   * Closes incidents that have been inactive for the specified threshold
   *
   * @param inactivityThresholdHours - Number of hours of inactivity before closing
   * @returns Array of closed incidents
   */
  async closeInactiveIncidents(
    inactivityThresholdHours: number,
  ): Promise<SiteIncident[]> {
    try {
      if (inactivityThresholdHours <= 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Inactivity threshold must be positive',
        });
      }

      const thresholdDate = new Date();
      thresholdDate.setHours(
        thresholdDate.getHours() - inactivityThresholdHours,
      );

      // Find active incidents with no recent alerts
      const inactiveIncidents = await prisma.siteIncident.findMany({
        where: {
          isActive: true,
          updatedAt: {
            lt: thresholdDate,
          },
        },
        include: {
          latestSiteAlert: true,
        },
      });

      const closedIncidents: SiteIncident[] = [];

      for (const incident of inactiveIncidents) {
        const closed = await prisma.siteIncident.update({
          where: {id: incident.id},
          data: {
            isActive: false,
            isProcessed: false,
            endedAt: new Date(),
          },
        });

        closedIncidents.push(closed);
        logger(`Closed inactive incident ${incident.id}`, 'info');
      }

      return closedIncidents;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(`Failed to close inactive incidents: ${String(error)}`, 'error');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to close inactive incidents',
        cause: error,
      });
    }
  }

  /**
   * Gets the active incident for a site, if one exists
   *
   * @param siteId - The ID of the site
   * @returns The active SiteIncident or null
   */
  async getActiveIncidentForSite(siteId: string): Promise<SiteIncident | null> {
    try {
      const incident = await prisma.siteIncident.findFirst({
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
        `Failed to get active incident for site ${siteId}: ${String(error)}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get active incident',
        cause: error,
      });
    }
  }

  /**
   * Gets incidents for a site within a date range
   *
   * @param siteId - The ID of the site
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of SiteIncidents
   */
  async getIncidentsByDateRange(
    siteId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SiteIncident[]> {
    try {
      if (startDate > endDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Start date must be before end date',
        });
      }

      const incidents = await prisma.siteIncident.findMany({
        where: {
          siteId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        include: {
          site: true,
          startSiteAlert: true,
          latestSiteAlert: true,
          endSiteAlert: true,
          siteAlerts: {
            orderBy: {
              eventDate: 'asc',
            },
          },
        },
      });

      return incidents;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(
        `Failed to get incidents for site ${siteId}: ${String(error)}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get incidents',
        cause: error,
      });
    }
  }

  /**
   * Updates the review status of an incident
   *
   * @param incidentId - The ID of the incident
   * @param status - The new review status
   * @returns The updated SiteIncident
   * @throws TRPCError if incident doesn't exist or status is invalid
   */
  async updateReviewStatus(
    incidentId: string,
    status: 'to_review' | 'in_review' | 'reviewed',
  ): Promise<SiteIncident> {
    try {
      const validStatuses = ['to_review', 'in_review', 'reviewed'];
      if (!validStatuses.includes(status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid review status. Must be one of: ${validStatuses.join(
            ', ',
          )}`,
        });
      }

      const incident = await prisma.siteIncident.update({
        where: {id: incidentId},
        data: {
          reviewStatus: status,
          updatedAt: new Date(),
        },
      });

      logger(
        `Updated review status for incident ${incidentId} to ${status}`,
        'info',
      );

      return incident;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(
        `Failed to update review status for incident ${incidentId}: ${String(
          error,
        )}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update review status',
        cause: error,
      });
    }
  }
}

export const siteIncidentService = new SiteIncidentService();
