import {prisma} from '../server/db';
import {logger} from '../server/logger';
import type {SiteIncident, Prisma} from '@prisma/client';

/**
 * Repository for SiteIncident data access operations
 */

/**
 * Finds the active incident for a given site
 */
export async function findActiveIncidentForSite(
  siteId: string,
): Promise<SiteIncident | null> {
  try {
    return await prisma.siteIncident.findFirst({
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
      `Error finding active incident for site ${siteId}: ${String(error)}`,
      'error',
    );
    throw error;
  }
}

/**
 * Finds incidents for a site within a date range
 */
export async function findIncidentsByDateRange(
  siteId: string,
  startDate: Date,
  endDate: Date,
): Promise<SiteIncident[]> {
  try {
    return await prisma.siteIncident.findMany({
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
  } catch (error) {
    logger(
      `Error finding incidents for site ${siteId}: ${String(error)}`,
      'error',
    );
    throw error;
  }
}

/**
 * Creates a new incident with transaction support
 */
export async function createIncident(
  data: Prisma.SiteIncidentCreateInput,
): Promise<SiteIncident> {
  try {
    return await prisma.$transaction(async tx => {
      // Verify site exists
      const site = await tx.site.findUnique({
        where: {id: data.site.connect?.id},
      });

      if (!site) {
        throw new Error('Site not found');
      }

      // Check for existing active incident
      const existingActive = await tx.siteIncident.findFirst({
        where: {
          siteId: site.id,
          isActive: true,
        },
      });

      if (existingActive) {
        throw new Error('An active incident already exists for this site');
      }

      // Create the incident
      return await tx.siteIncident.create({
        data,
      });
    });
  } catch (error) {
    logger(`Error creating incident: ${String(error)}`, 'error');
    throw error;
  }
}

/**
 * Updates an incident with state transition validation
 */
export async function updateIncident(
  id: string,
  data: Prisma.SiteIncidentUpdateInput,
): Promise<SiteIncident> {
  try {
    return await prisma.$transaction(async tx => {
      // Get current incident
      const current = await tx.siteIncident.findUnique({
        where: {id},
      });

      if (!current) {
        throw new Error('Incident not found');
      }

      // Prevent modification of closed incidents
      if (!current.isActive && current.isProcessed) {
        throw new Error('Cannot modify a closed incident');
      }

      // Update the incident
      return await tx.siteIncident.update({
        where: {id},
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    });
  } catch (error) {
    logger(`Error updating incident ${id}: ${String(error)}`, 'error');
    throw error;
  }
}

/**
 * Finds incidents that need to be closed due to inactivity
 */
export async function findInactiveIncidents(
  inactivityThresholdHours: number,
): Promise<SiteIncident[]> {
  try {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - inactivityThresholdHours);

    return await prisma.siteIncident.findMany({
      where: {
        isActive: true,
        updatedAt: {
          lt: thresholdDate,
        },
      },
      include: {
        latestSiteAlert: true,
        site: true,
      },
    });
  } catch (error) {
    logger(`Error finding inactive incidents: ${String(error)}`, 'error');
    throw error;
  }
}

/**
 * Gets an incident by ID with all related data
 */
export async function getIncidentById(
  id: string,
): Promise<SiteIncident | null> {
  try {
    return await prisma.siteIncident.findUnique({
      where: {id},
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
  } catch (error) {
    logger(`Error getting incident ${id}: ${String(error)}`, 'error');
    throw error;
  }
}

/**
 * Counts alerts associated with an incident
 */
export async function countIncidentAlerts(incidentId: string): Promise<number> {
  try {
    return await prisma.siteAlert.count({
      where: {
        siteIncidentId: incidentId,
      },
    });
  } catch (error) {
    logger(
      `Error counting alerts for incident ${incidentId}: ${String(error)}`,
      'error',
    );
    throw error;
  }
}
