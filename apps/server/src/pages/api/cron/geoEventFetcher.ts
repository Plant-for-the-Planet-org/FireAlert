// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geoEventFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { NextApiRequest, NextApiResponse } from "next";
import GeoEventProviderRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { PrismaClient, GeoEventProvider } from '@prisma/client'
import geoEventEmitter from '../../../Events/EventEmitter/GeoEventEmitter'
import { GEO_EVENTS_CREATED } from '../../../Events/messageConstants'

// TODO: Run this cron every 5 minutes
export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {

  const prisma = new PrismaClient()

  // get all active providers
  const allActiveProviders: GeoEventProvider[] = await prisma.geoEventProvider.findMany({
    where: {
      isActive: true,
      // fetchFrequency: {
      //   not:{
      //     equals: null
      //   }
      // }
    },
  });

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

  const promises = activeProviders.map(async (provider) => {
    const { providerKey, config } = provider
    const geoEventProvider = GeoEventProviderRegistry.get(providerKey);
    geoEventProvider.initialize(JSON.parse(JSON.stringify(config)));

    const geoEvents = await geoEventProvider.getLatestGeoEvents()
    const identityGroup = geoEventProvider.getIdentityGroup()
    geoEventEmitter.emit(GEO_EVENTS_CREATED, providerKey, identityGroup, geoEvents)

    // Update lastRun value of the provider to the current Date()
    await prisma.geoEventProvider.update({
      where: {
        id: provider.id
      },
      data: {
        lastRun: new Date()
      },
    });
  })

  await Promise.all(promises);

  res.status(200).json({ message: "Cron job executed successfully" });
}
