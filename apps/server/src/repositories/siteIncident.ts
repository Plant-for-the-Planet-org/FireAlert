import type {SiteIncident} from '@prisma/client';
import {prisma} from '../server/db';
import {logger} from '../server/logger';

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
