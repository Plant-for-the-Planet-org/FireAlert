// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geoEventFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { type NextApiRequest, type NextApiResponse } from "next";
import GeoEventProviderClassRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { type GeoEventProvider } from '@prisma/client'
import { type GeoEventProviderConfig } from '../../../Interfaces/GeoEventProvider'
import { env } from "../../../env.mjs";
import processGeoEvents from "../../../../src/Services/GeoEvent/GeoEventHandler";
import createNotifications from "../../../../src/Services/Notifications/CreateNotifications";
import createSiteAlerts from "../../../../src/Services/SiteAlert/CreateSiteAlert";
import { logger } from "../../../../src/server/logger";
import { GeoEventProviderClientId } from "../../../Interfaces/GeoEventProvider";
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

  // get all active providers
  const allActiveProviders: GeoEventProvider[] = await prisma.geoEventProvider.findMany({
    where: {
      isActive: true,
    },
  });
  logger(`Running Geo Event Fetcher. Found ${allActiveProviders.length} providers.`, "info");
  function filterAllActiveProviders(date: Date, minutes: number): boolean {
    // Create a new date by adding minutes to the input date
    const scheduledRunDate = new Date(date.getTime() + minutes * 60000); // Convert minutes to milliseconds

    // Get the current date and time
    const currentDate = new Date();

    // Compare the future date with the current date
    // Future date must be less than current date for it to run
    if (scheduledRunDate < currentDate) {
      return true;
    } else {
      return false;
    }
  }

  // Filter out those active providers whose last (run date + fetchFrequency (in minutes) > current time
  const activeProviders = allActiveProviders.filter(provider => {
    if (!provider.fetchFrequency) {
      return false
    }
    if (!provider.lastRun) {
      return true
    }
    return filterAllActiveProviders(provider.lastRun, provider.fetchFrequency)
  });

  let newSiteAlertCount = 0;
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

        // and then create site Alerts
        if (eventCount > 0) {
          const alertCount = await createSiteAlerts(geoEventProviderId, geoEventProviderClientId as GeoEventProviderClientId, slice)
          logger(`${breadcrumbPrefix} Created ${alertCount} Site Alerts.`, "info");

          newSiteAlertCount += alertCount
        }

        // Update lastRun value of the provider to the current Date()
        await prisma.geoEventProvider.update({
          where: {
            id: provider.id
          },
          data: {
            lastRun: new Date()
          },
        });
      });

  })

  await Promise.all(promises).catch(error => logger(`Something went wrong before creating notifications. ${error}`, "error"));

  if (newSiteAlertCount > 0) {
    logger(`Now Creating notifications for ${newSiteAlertCount} alerts`, "info");
    await createNotifications();
  }
  logger(`All done. ${newSiteAlertCount} Alerts. Cron has completed`, "info");

  res.status(200).json({ message: "Cron job executed successfully" });
}
