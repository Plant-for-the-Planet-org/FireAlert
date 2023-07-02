// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geo-event-fetcher

import { type NextApiRequest, type NextApiResponse } from "next";
import GeoEventProviderClassRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { type GeoEventProvider } from '@prisma/client'
import { type GeoEventProviderConfig } from '../../../Interfaces/GeoEventProvider'
import { env } from "../../../env.mjs";
import processGeoEvents from "../../../../src/Services/GeoEvent/GeoEventHandler";
import createNotifications from "../../../../src/Services/Notifications/CreateNotifications";
import createSiteAlerts from "../../../../src/Services/SiteAlert/CreateSiteAlert";
import { logger } from "../../../../src/server/logger";
import { type GeoEventProviderClientId } from "../../../Interfaces/GeoEventProvider";
import { prisma } from "../../../../src/server/db";


// TODO: Run this cron every 5 minutes
export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {
  // Verify the 'cron_key' in the request headers before proceeding
  if (env.CRON_KEY) {
    // Verify the 'cron_key' in the request headers
    const cronKey = req.query['cron_key'];
    if (!cronKey || cronKey !== env.CRON_KEY) {
      res.status(403).json({ message: "Unauthorized Invalid Cron Key" });
      return;
    }
  }

  // get all active providers where now  fetch frequenncy + last run is greater than current time

  let newSiteAlertCount = 0;
  let processedProviders = 0;

  while (true) {
    const activeProviders: GeoEventProvider[] = await prisma.$queryRaw`
        SELECT *
        FROM "GeoEventProvider"
        WHERE "isActive" = true
          AND "fetchFrequency" IS NOT NULL
          AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
        LIMIT 4;

    `;
    // Filter out those active providers whose last (run date + fetchFrequency (in minutes) > current time
    // Break the loop if there are no active providers
    if (activeProviders.length === 0) {
      logger(`Nothing to process anymore activeProviders.length = 0`, "info");
      break;
    }

    logger(`Running Geo Event Fetcher. Taking ${activeProviders.length} eligible providers.`, "info");


    // Loop for each active provider and fetch geoEvents
    const promises = activeProviders.map(async (provider) => {
      const { config, id: geoEventProviderId, clientId: geoEventProviderClientId, clientApiKey } = provider
      const parsedConfig: GeoEventProviderConfig = JSON.parse(JSON.stringify(config))
      const client = parsedConfig.client
      const geoEventProvider = GeoEventProviderClassRegistry.get(client);
      geoEventProvider.initialize(parsedConfig);

      const slice = parsedConfig.slice;
      const breadcrumbPrefix = `${geoEventProviderClientId} Slice ${slice}:`

      // First fetch all geoEvents from the provider
      return await geoEventProvider.getLatestGeoEvents(geoEventProviderClientId, geoEventProviderId, slice, clientApiKey)
        .then(async (geoEvents) => {
          // If there are geoEvents, emit an event to find duplicates and persist them
          logger(`${breadcrumbPrefix} Fetched ${geoEvents.length} geoEvents`, "info");

          let eventCount = 0;
          if (geoEvents.length > 0) {
            eventCount = await processGeoEvents(breadcrumbPrefix, geoEventProviderClientId as GeoEventProviderClientId, geoEventProviderId, slice, geoEvents)
          }

          // TODO:
          // ----------------
          // Temporarily disabling the eventCount check for SiteAlerts
          // This helps in creating SiteAlerts for unprocessed geoEvents from past runs, if fetch fails for some reason

          // and then create site Alerts
          
          //if (eventCount > 0) {
            const alertCount = await createSiteAlerts(geoEventProviderId, geoEventProviderClientId as GeoEventProviderClientId, slice)
            logger(`${breadcrumbPrefix} Created ${alertCount} Site Alerts.`, "info");

            newSiteAlertCount += alertCount
          // }

          // Update lastRun value of the provider to the current Date()
          await prisma.geoEventProvider.update({
            where: {
              id: provider.id
            },
            data: {
              lastRun: new Date().toISOString()
            },
          });
        });

    })
    processedProviders += activeProviders.length;

    await Promise.all(promises).catch(error => logger(`Something went wrong before creating notifications. ${error}`, "error"));
  }

  // let notificationCount;
  //if (newSiteAlertCount > 0) {
    const notificationCount = await createNotifications();
    logger(`Added ${notificationCount} notifications for ${newSiteAlertCount} alerts`, "info");
  // }
  // else {
  //   logger(`All done. ${newSiteAlertCount} Alerts. No new notifications. Waving Goodbye!`, "info");
  // }

  res.status(200).json({
    message: "Cron job executed successfully",
    alertsCreated: newSiteAlertCount,
    notificationCount: notificationCount,
    processedProviders: processedProviders,
    status: 200
  });
}
