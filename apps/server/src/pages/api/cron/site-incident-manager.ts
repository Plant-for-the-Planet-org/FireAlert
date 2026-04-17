// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/site-incident-manager
// This CRON job manages the lifecycle of SiteIncidents
// 1. Backfills/Links SiteAlerts that are not associated with any incident (e.g. manually created ones)
// 2. Resolves inactive SiteIncidents

import {type NextApiRequest, type NextApiResponse} from 'next';
import {prisma} from '@/server/db';
import {logger} from '@/server/logger';
import {env} from '@/env.mjs';

// This ensures that the Vercel serverless function runs for a maximum of 300 seconds
export const config = {
  maxDuration: 300,
};

export default async function siteIncidentManager(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const start = Date.now();

  // 1. Validate cron key
  // This is a basic security check to prevent unauthorized access
  if (env.CRON_KEY) {
    const cronKey = req.query['cron_key'];
    if (!cronKey || cronKey !== env.CRON_KEY) {
      return res.status(403).json({message: 'Unauthorized: Invalid Cron Key'});
    }
  }

  try {
    // 2. Initialize Services
    const {SiteIncidentRepository} = await import(
      '../../../Services/SiteIncident/SiteIncidentRepository'
    );
    const {IncidentResolver} = await import(
      '../../../Services/SiteIncident/IncidentResolver'
    );
    const {SiteIncidentService} = await import(
      '../../../Services/SiteIncident/SiteIncidentService'
    );

    const siteIncidentRepo = new SiteIncidentRepository(prisma);
    const incidentResolver = new IncidentResolver(siteIncidentRepo);
    const siteIncidentService = new SiteIncidentService(
      siteIncidentRepo,
      incidentResolver,
      env.INCIDENT_RESOLUTION_HOURS || 6,
    );

    // 3. Batch Process All Unlinked Alerts FIRST
    const BATCH_SIZE = 50;
    const THREE_HOURS_AGO = new Date(Date.now() - 3 * 60 * 60 * 1000);

    let totalLinkedCount = 0;
    let totalProcessedCount = 0;
    let batchNumber = 0;
    const linkErrors: Array<{id: string; error: string}> = [];

    // Process all unlinked alerts in batches
    while (true) {
      batchNumber++;

      const unlinkedAlerts = await prisma.siteAlert.findMany({
        where: {
          siteIncidentId: null,
          isProcessed: false,
          eventDate: {
            gte: THREE_HOURS_AGO,
          },
        },
        take: BATCH_SIZE,
        orderBy: {
          eventDate: 'asc',
        },
      });

      if (unlinkedAlerts.length === 0) {
        break;
      }

      totalProcessedCount += unlinkedAlerts.length;

      for (const alert of unlinkedAlerts) {
        try {
          await siteIncidentService.processNewSiteAlert(alert);
          totalLinkedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          linkErrors.push({id: alert.id, error: errorMessage});
        }
      }
    }

    // 4. Resolve inactive incidents after linking alerts so fresh activity is considered
    let resolvedCount = 0;
    try {
      resolvedCount = await siteIncidentService.resolveInactiveIncidents();
    } catch (error) {
      // Continue and report linked work even if resolution fails
    }

    const duration = Date.now() - start;

    logger(
      `Site Incident Manager: Processed ${totalProcessedCount} alerts in ${batchNumber} batches, Linked: ${totalLinkedCount}, Resolved: ${resolvedCount} incidents, Errors: ${linkErrors.length}, Duration: ${duration}ms`,
      'info',
    );

    return res.status(200).json({
      message: 'Site Incident Manager executed successfully',
      batchesProcessed: batchNumber,
      totalAlertsProcessed: totalProcessedCount,
      alertsLinked: totalLinkedCount,
      incidentsResolved: resolvedCount,
      errors: linkErrors,
      durationMs: duration,
      status: 200,
    });
  } catch (error) {
    logger(
      `Critical error in Site Incident Manager: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
