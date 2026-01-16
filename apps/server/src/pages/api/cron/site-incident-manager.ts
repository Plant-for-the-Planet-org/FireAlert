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
    logger('Starting Site Incident Manager CRON', 'info');

    // 2. Initialize Services
    // We use dynamic imports here to keep the cold start time low if possible,
    // though for a CRON it matters less than for a user-facing API.
    // It also matches the pattern in geo-event-fetcher.ts
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

    // 3. Backfill / Link Unassociated SiteAlerts
    // Find alerts that have null siteIncidentId
    // We limit this to avoid timeouts if there are massive amounts of unlinked alerts
    const BATCH_SIZE = 50;

    logger(
      `Finding unassociated SiteAlerts (Limit: ${BATCH_SIZE})...`,
      'debug',
    );

    const unlinkedAlerts = await prisma.siteAlert.findMany({
      where: {
        siteIncidentId: null,
      },
      take: BATCH_SIZE,
      orderBy: {
        eventDate: 'asc', // Process oldest first
      },
    });

    let linkedCount = 0;
    const linkErrors: Array<{id: string; error: string}> = [];

    if (unlinkedAlerts.length > 0) {
      logger(
        `Found ${unlinkedAlerts.length} unassociated alerts. Processing...`,
        'info',
      );

      for (const alert of unlinkedAlerts) {
        try {
          // This method handles creating a new incident OR linking to an existing active one
          await siteIncidentService.processNewSiteAlert(alert);
          linkedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger(
            `Error processing unlinked alert ${alert.id}: ${errorMessage}`,
            'error',
          );
          linkErrors.push({id: alert.id, error: errorMessage});
        }
      }
    } else {
      logger('No unassociated SiteAlerts found.', 'debug');
    }

    // 4. Resolve Inactive Incidents
    // This closes incidents that haven't had activity for > 6 hours
    logger('Resolving inactive incidents...', 'debug');
    let resolvedCount = 0;
    try {
      resolvedCount = await siteIncidentService.resolveInactiveIncidents();
    } catch (error) {
      logger(
        `Error resolving incidents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      // We don't throw here to allow the response to return partial success stats
    }

    const duration = Date.now() - start;

    logger(
      `Site Incident Manager finished in ${duration}ms. Linked: ${linkedCount}, Resolved: ${resolvedCount}`,
      'info',
    );

    return res.status(200).json({
      message: 'Site Incident Manager executed successfully',
      stats: {
        unlinkedAlertsFound: unlinkedAlerts.length,
        alertsProcessed: linkedCount,
        incidentsResolved: resolvedCount,
        errors: linkErrors,
        durationMs: duration,
      },
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
