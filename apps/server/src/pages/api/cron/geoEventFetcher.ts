// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geoEventFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { NextApiRequest, NextApiResponse } from "next";
import GeoEventProviderRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { PrismaClient, GeoEventProvider } from '@prisma/client'
import geoEventEmitter from '../../../Events/EventEmitter/GeoEventEmitter'
import { GEO_EVENTS_CREATED } from '../../../Events/messageConstants'

export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {

  const prisma = new PrismaClient()

  // fetch all active providers from the GeoEventProvider table
  const activeProviders: GeoEventProvider[] = await prisma.geoEventProvider.findMany({
    where: {
      isActive: true,
    },
  })

  activeProviders.map(provider => {
    const { source, config, sourceKey } = provider
    const geoEventProvider = GeoEventProviderRegistry.get(sourceKey);
    geoEventProvider.initialize(JSON.parse(JSON.stringify(config)));

    (async () => {
      const geoEvents = await geoEventProvider.getLatestGeoEvents(sourceKey)

      geoEventEmitter.emit(GEO_EVENTS_CREATED, sourceKey, geoEvents)
    })()
  })

  res.status(200).json({ message: "Cron job executed successfully" });
}
