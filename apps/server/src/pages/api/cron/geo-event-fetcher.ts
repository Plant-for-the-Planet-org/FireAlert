// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geo-event-fetcher

import { type NextApiRequest, type NextApiResponse } from "next";
import GeoEventProviderClassRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { type GeoEventProvider } from '@prisma/client'
import { type GeoEventProviderConfig } from '../../../Interfaces/GeoEventProvider'
import { env } from "../../../env.mjs";
import processGeoEvents from "../../../../src/Services/GeoEvent/GeoEventHandler";
import createSiteAlerts from "../../../../src/Services/SiteAlert/CreateSiteAlert";
import { logger } from "../../../../src/server/logger";
import { type GeoEventProviderClientId } from "../../../Interfaces/GeoEventProvider";
import { prisma } from "../../../../src/server/db";
import { type geoEventInterface as GeoEvent } from "../../../Interfaces/GeoEvent"

// This ensures that the alertFetcher Vercel serverless function runs for a maximum of 300 seconds
// 300s is the maximum allowed duration for Vercel pro plans
export const config = {
  maxDuration: 300,
};

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

  // Set Limit to 7 if not provided or greater than 10
  // Extract limit from query
  const rawLimit = req.query['limit'];

  // Initialize final limit as number
  let limit: number;

  if (typeof rawLimit === 'string') {
    const parsedLimit = parseInt(rawLimit, 10);
    if (isNaN(parsedLimit) || parsedLimit > 15) {
      limit = 15;
    } else {
      limit = parsedLimit;
    }
  } else {
    limit = 4;
  }



  // get all active providers where now  fetch frequency + last run is greater than current time


  let newSiteAlertCount = 0;
  let processedProviders = 0;

  // while (processedProviders <= limit) {
    const activeProviders: GeoEventProvider[] = await prisma.$queryRaw`
        SELECT *
        FROM "GeoEventProvider"
        WHERE "isActive" = true
          AND "fetchFrequency" IS NOT NULL
          AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
        LIMIT ${limit};

    `;
    // Filter out those active providers whose last (run date + fetchFrequency (in minutes) > current time
    // Break the loop if there are no active providers
    
    // if (activeProviders.length === 0) {
    //   logger(`Nothing to process anymore activeProviders.length = 0`, "info");
    //   break;
    // }

    logger(`Running Geo Event Fetcher. Taking ${activeProviders.length} eligible providers.`, "info");

      // Define Chunk Size for processGeoEvents
    const chunkSize = 2000;
    const chunkArray = (array: GeoEvent[], size: number) => {
      const chunked = [];
      let index = 0;
      while (index < array.length) {
          chunked.push(array.slice(index, size + index));
          index += size;
      }
      return chunked;
    }

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
          

          let totalEventCount = 0;
          let totalNewGeoEvent = 0;

          if (geoEvents.length > 0) {
            // Split geoEvents into smaller chunks
            const geoEventChunks = chunkArray(geoEvents, chunkSize);
            
            // Process each chunk sequentially
            for (const geoEventChunk of geoEventChunks) {
                const processedGeoEvent = await processGeoEvents(breadcrumbPrefix, geoEventProviderClientId as GeoEventProviderClientId, geoEventProviderId, slice, geoEventChunk);
                totalEventCount += processedGeoEvent.geoEventCount;
                totalNewGeoEvent += processedGeoEvent.newGeoEventCount;
            }
          }

          logger(`${breadcrumbPrefix} Found ${totalNewGeoEvent} new Geo Events`, "info");
          logger(`${breadcrumbPrefix} Created ${totalEventCount} Geo Events`, "info");

          // if (totalNewGeoEvent > 0) {
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

  res.status(200).json({
    message: "Geo-event-fetcher Cron job executed successfully",
    alertsCreated: newSiteAlertCount,
    // notificationCount: notificationCount,
    processedProviders: processedProviders,
    status: 200
  });
}
